/**
 * Copyright 2018, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {types} from '@opencensus/opencensus-core';
import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';
import * as httpModule from 'http';
import * as semver from 'semver';
import * as shimmer from 'shimmer';
import * as url from 'url';
import * as uuid from 'uuid';


// TODO: maybe we should have a setup as a Client or as Server.

export type HttpModule = typeof httpModule;
export type RequestFunction = typeof httpModule.request;

/** Http instrumentation plugin for Opencensus */
export class HttpPlugin extends classes.BasePlugin {
  /**
   * Attributes Names according to Opencensus HTTP Specs
   * https://github.com/census-instrumentation/opencensus-specs/blob/master/trace/HTTP.md
   */
  static ATTRIBUTE_HTTP_HOST = 'http.host';
  static ATTRIBUTE_HTTP_METHOD = 'http.method';
  static ATTRIBUTE_HTTP_PATH = 'http.path';
  static ATTRIBUTE_HTTP_ROUTE = 'http.route';
  static ATTRIBUTE_HTTP_USER_AGENT = 'http.user_agent';
  static ATTRIBUTE_HTTP_STATUS_CODE = 'http.status_code';
  // NOT ON OFFICIAL SPEC
  static ATTRIBUTE_HTTP_ERROR_NAME = 'http.error_name';
  static ATTRIBUTE_HTTP_ERROR_MESSAGE = 'http.error_message';

  logger: types.Logger;

  /** Constructs a new HttpPlugin instance. */
  constructor(moduleName: string) {
    super(moduleName);
  }


  // TODO: moduleExports should use type HttpModule instead of any
  /**
   * Patches HTTP incoming and outcoming request functions.
   * @param moduleExports The http module exports
   * @param tracer A tracer instance to create spans on.
   * @param version The package version.
   */
  // tslint:disable-next-line:no-any
  applyPatch(moduleExports: any, tracer: types.Tracer, version: string) {
    this.setPluginContext(moduleExports, tracer, version);
    this.logger = tracer.logger || logger.logger('debug');

    this.logger.debug('applying pacth to %s@%s', this.moduleName, this.version);

    shimmer.wrap(moduleExports, 'request', this.patchOutgoingRequest());

    // In Node 8, http.get calls a private request method, therefore we patch it
    // here too.
    if (semver.satisfies(version, '>=8.0.0')) {
      shimmer.wrap(moduleExports, 'get', this.patchOutgoingRequest());
    }

    if (moduleExports && moduleExports.Server &&
        moduleExports.Server.prototype) {
      shimmer.wrap(
          moduleExports && moduleExports.Server &&
              moduleExports.Server.prototype,
          'emit', this.patchIncomingRequest());
    } else {
      this.logger.error(
          'Could not apply patch to %s.emit. Interface is not as expected.',
          this.moduleName);
    }

    return moduleExports;
  }


  /** Unpatches all HTTP patched function. */
  applyUnpatch(): void {
    shimmer.unwrap(this.moduleExports, 'request');
    if (semver.satisfies(this.version, '>=8.0.0')) {
      shimmer.unwrap(this.moduleExports, 'get');
    }
    if (this.moduleExports && this.moduleExports.Server &&
        this.moduleExports.Server.prototype) {
      shimmer.unwrap(
          this.moduleExports && this.moduleExports.Server &&
              this.moduleExports.Server.prototype,
          'emit');
    }
  }


  /**
   * Creates spans for incoming requests, restoring spans' context if applied.
   */
  patchIncomingRequest() {
    // TODO: evaluate if this function should return RequestFunction
    return (original: RequestFunction):
               types.Func<httpModule.ClientRequest> => {
      const plugin = this;
      return function incomingRequest(
                 event: string, request: httpModule.IncomingMessage,
                 response: httpModule.ServerResponse):
          httpModule.ClientRequest {
            // Only traces request events
            if (event !== 'request') {
              return original.apply(this, arguments);
            }

            plugin.logger.debug('%s plugin incomingRequest', plugin.moduleName);
            const propagation = plugin.tracer.propagation;
            const headers = request.headers;
            const getter: types.HeaderGetter = {
              getHeader(name: string) {
                return headers[name];
              }
            };

            const traceOptions = {
              name: url.parse(request.url).pathname,
              type: 'SERVER',
              spanContext: propagation ? propagation.extract(getter) : null
            };

            return plugin.tracer.startRootSpan(traceOptions, rootSpan => {
              if (!rootSpan) return original.apply(this, arguments);

              plugin.tracer.wrapEmitter(request);
              plugin.tracer.wrapEmitter(response);

              // Wraps end (inspired by:
              // https://github.com/GoogleCloudPlatform/cloud-trace-nodejs/blob/master/src/plugins/plugin-connect.ts#L75)
              const originalEnd = response.end;

              response.end = function(this: httpModule.ServerResponse) {
                response.end = originalEnd;
                const returned = response.end.apply(this, arguments);

                const requestUrl = url.parse(request.url);
                const host = headers.host || 'localhost';
                const userAgent =
                    (headers['user-agent'] || headers['User-Agent']) as string;

                rootSpan.addAttribute(
                    HttpPlugin.ATTRIBUTE_HTTP_HOST,
                    host.replace(
                        /^(.*)(\:[0-9]{1,5})/,
                        '$1',
                        ));
                rootSpan.addAttribute(
                    HttpPlugin.ATTRIBUTE_HTTP_METHOD, request.method);
                rootSpan.addAttribute(
                    HttpPlugin.ATTRIBUTE_HTTP_PATH, requestUrl.pathname);
                rootSpan.addAttribute(
                    HttpPlugin.ATTRIBUTE_HTTP_ROUTE, requestUrl.path);
                rootSpan.addAttribute(
                    HttpPlugin.ATTRIBUTE_HTTP_USER_AGENT, userAgent);

                rootSpan.addAttribute(
                    HttpPlugin.ATTRIBUTE_HTTP_STATUS_CODE,
                    response.statusCode.toString());

                rootSpan.status = plugin.traceStatus(response.statusCode);

                // Message Event ID is not defined
                rootSpan.addMessageEvent(
                    'MessageEventTypeRecv', uuid.v4().split('-').join(''));

                rootSpan.end();
                return returned;
              };

              return original.apply(this, arguments);
            });
          };
    };
  }


  /**
   * Creates spans for outgoing requests, sending spans' context for distributed
   * tracing.
   */
  patchOutgoingRequest() {
    return (original: types.Func<httpModule.ClientRequest>):
               types.Func<httpModule.ClientRequest> => {
      const plugin = this;
      return function outgoingRequest(
                 options, callback): httpModule.ClientRequest {
        if (!options) {
          return original.apply(this, arguments);
        }

        // Makes sure the url is an url object
        if (typeof (options) === 'string') {
          options = url.parse(options);
          arguments[0] = options;
        } else {
          // Do not trace ourselves
          if (options.headers &&
              options.headers['x-opencensus-outgoing-request']) {
            plugin.logger.debug(
                'header with "x-opencensus-outgoing-request" - do not trace');
            return original.apply(this, arguments);
          }
        }

        const request = original.apply(this, arguments);

        plugin.tracer.wrapEmitter(request);

        plugin.logger.debug('%s plugin outgoingRequest', plugin.moduleName);
        const traceOptions = {
          name:
              `${request.method ? request.method : 'GET'} ${options.pathname}`,
          type: 'CLIENT',
        };


        // Checks if this outgoing request is part of an operation by checking
        // if there is a current root span, if so, we create a child span. In
        // case there is no root span, this means that the outgoing request is
        // the first operation, therefore we create a root span.
        if (!plugin.tracer.currentRootSpan) {
          plugin.logger.debug('outgoingRequest starting a root span');
          return plugin.tracer.startRootSpan(
              traceOptions, plugin.makeRequestTrace(request, options, plugin));
        } else {
          plugin.logger.debug('outgoingRequest starting a child span');
          const span = plugin.tracer.startChildSpan(
              traceOptions.name, traceOptions.type);
          return (plugin.makeRequestTrace(request, options, plugin))(span);
        }
      };
    };
  }

  // TODO: type of options shold be better define
  /**
   * Injects span's context to header for distributed tracing and finshes the
   * span when the response is finished.
   * @param original The original patched function.
   * @param options The arguments to the original function.
   */
  makeRequestTrace(
      // tslint:disable-next-line:no-any
      request: httpModule.ClientRequest, options: any,
      plugin: HttpPlugin): types.Func<httpModule.ClientRequest> {
    return (span: types.Span): httpModule.ClientRequest => {
      plugin.logger.debug('makeRequestTrace');

      const headers = options.headers;
      const setter: types.HeaderSetter = {
        setHeader(name: string, value: string) {
          headers[name] = value;
        }
      };

      const propagation = plugin.tracer.propagation;
      if (propagation) {
        propagation.inject(setter, span.spanContext);
      }

      if (!span) {
        plugin.logger.debug('makeRequestTrace span is null');
        return request;
      }

      request.on('response', (response: httpModule.ClientResponse) => {
        plugin.tracer.wrapEmitter(response);
        plugin.logger.debug('outgoingRequest on response()');

        response.on('end', () => {
          plugin.logger.debug('outgoingRequest on end()');
          const method = response.method ? response.method : 'GET';
          const reqUrl = url.parse(options);
          const userAgent =
              headers ? (headers['user-agent'] || headers['User-Agent']) : null;

          span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_HOST, reqUrl.hostname);
          span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_METHOD, method);
          span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_PATH, reqUrl.pathname);
          span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_ROUTE, reqUrl.path);
          span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_USER_AGENT, userAgent);
          span.addAttribute(
              HttpPlugin.ATTRIBUTE_HTTP_STATUS_CODE,
              response.statusCode.toString());

          span.status = plugin.traceStatus(response.statusCode);

          // Message Event ID is not defined
          span.addMessageEvent(
              'MessageEventTypeSent', uuid.v4().split('-').join(''));

          span.end();
        });

        response.on('error', error => {
          span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_ERROR_NAME, error.name);
          span.addAttribute(
              HttpPlugin.ATTRIBUTE_HTTP_ERROR_MESSAGE, error.message);
          span.status = TraceStatusCodes.UNKNOWN;
          span.end();
        });
      });

      plugin.logger.debug('makeRequestTrace retun request');
      return request;
    };
  }

  traceStatus(statusCode: number): number {
    if (statusCode < 200 || statusCode > 504) {
      return TraceStatusCodes.UNKNOWN;
    } else if (statusCode >= 200 && statusCode < 400) {
      return TraceStatusCodes.OK;
    } else {
      switch (statusCode) {
        case (400):
          return TraceStatusCodes.INVALID_ARGUMENT;
        case (504):
          return TraceStatusCodes.DEADLINE_EXCEEDED;
        case (404):
          return TraceStatusCodes.NOT_FOUND;
        case (403):
          return TraceStatusCodes.PERMISSION_DENIED;
        case (401):
          return TraceStatusCodes.UNAUTHENTICATED;
        case (429):
          return TraceStatusCodes.RESOURCE_EXHAUSTED;
        case (501):
          return TraceStatusCodes.UNIMPLEMENTED;
        case (503):
          return TraceStatusCodes.UNAVAILABLE;
        default:
          return TraceStatusCodes.UNKNOWN;
      }
    }
  }
}

export enum TraceStatusCodes {
  UNKNOWN = 2,
  OK = 0,
  INVALID_ARGUMENT = 3,
  DEADLINE_EXCEEDED = 4,
  NOT_FOUND = 5,
  PERMISSION_DENIED = 7,
  UNAUTHENTICATED = 16,
  RESOURCE_EXHAUSTED = 8,
  UNIMPLEMENTED = 12,
  UNAVAILABLE = 14
}


const plugin = new HttpPlugin('http');
export {plugin};
