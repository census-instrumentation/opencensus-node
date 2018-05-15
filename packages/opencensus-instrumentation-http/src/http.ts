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
import * as semver from 'semver';
import * as shimmer from 'shimmer';
import * as url from 'url';
import * as uuid from 'uuid';

// import * as Debug from 'debug';
// const debug = Debug('opencensus');

export class HttpPlugin extends classes.BasePlugin {
  logger: types.Logger;

  /** Constructs a new HttpPlugin instance. */
  constructor(moduleName: string) {
    super(moduleName);
  }

  /**
   * Patches HTTP incoming and outcoming request functions.
   * @param moduleExporters The HTTP package.
   * @param tracer A tracer instance to create spans on.
   * @param version The package version.
   */
  // tslint:disable:no-any
  applyPatch(moduleExporters: any, tracer: types.Tracer, version: string) {
    this.setPluginContext(moduleExporters, tracer, version);
    this.logger = tracer.logger || logger.logger('debug');

    this.logger.debug('applying pacth to %s@%s', this.moduleName, this.version);

    shimmer.wrap(moduleExporters, 'request', this.patchOutgoingRequest());

    // In Node 8, http.get calls a private request method, therefore we patch it
    // here too.
    if (semver.satisfies(version, '>=8.0.0')) {
      shimmer.wrap(moduleExporters, 'get', this.patchOutgoingRequest());
    }

    shimmer.wrap(
        moduleExporters && moduleExporters.Server &&
            moduleExporters.Server.prototype,
        'emit', this.patchIncomingRequest());

    return moduleExporters;
  }

  /** Unpatches all HTTP patched function. */
  applyUnpatch(): void {
    shimmer.unwrap(this.moduleExporters, 'request');
    if (semver.satisfies(this.version, '>=8.0.0')) {
      shimmer.unwrap(this.moduleExporters, 'get');
    }
    shimmer.unwrap(
        this.moduleExporters && this.moduleExporters.Server &&
            this.moduleExporters.Server.prototype,
        'emit');
  }

  /**
   * Creates spans for incoming requests, restoring spans' context if applied.
   * @param plugin The HTTP plugin itself.
   */
  patchIncomingRequest() {
    const plugin: HttpPlugin = this;
    return (original: Function): Function => {
      // tslint:disable:no-any
      return function incomingRequest(
          event: string, request: any, response: any) {
        // Only traces request events
        if (event !== 'request') {
          return original.apply(this, arguments);
        }

        plugin.logger.debug('%s plugin incomingRequest', plugin.moduleName);
        const propagation = plugin.tracer.propagation;
        const headers = arguments[1].headers;
        const getter = {
          getHeader(name: string) {
            return headers[name];
          }
        } as types.HeaderGetter;
        const traceOptions = {
          name: arguments[1].url,
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
          // tslint:disable:no-any
          response.end = function(this: any) {
            response.end = originalEnd;
            const returned = response.end.apply(this, arguments);

            rootSpan.addAttribute('http.host', request.url.host);
            rootSpan.addAttribute('http.method', request.method);
            rootSpan.addAttribute('http.path', request.url.pathname);
            rootSpan.addAttribute('http.route', request.url.path);
            rootSpan.addAttribute(
                'http.user_agent', 'HTTPClient/' + request.httpVersion);
            rootSpan.addAttribute('http.status_code', request.statusCode);

            rootSpan.status = plugin.traceStatus(request.statusCode);

            // Message Event ID is not defined
            rootSpan.addMessageEvent(
                'MessageEventTypeRecv', uuid.v4().split('-').join(''));

            // debug('Ended root span: ', rootSpan.name, rootSpan.id,
            // rootSpan.traceId);
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
   * @param plugin The HTTP plugin itself.
   */
  patchOutgoingRequest() {
    const plugin: HttpPlugin = this;
    // tslint:disable:no-any
    return (original: any): any => {
      return function outgoingRequest() {
        // Makes sure the url is an url object
        if (typeof (arguments[0]) === 'string') {
          arguments[0] = url.parse(arguments[0]);
        }

        // Do not trace ourselves
        if (arguments[0].headers &&
            arguments[0].headers['x-opencensus-outgoing-request']) {
          // tslint:disable:no-any
          plugin.logger.debug(
              'header with "x-opencensus-outgoing-request" - do not trace');
          return original.apply(this, arguments);
        }

        const request = original.apply(this, arguments);

        plugin.tracer.wrapEmitter(request);

        plugin.logger.debug('%s plugin outgoingRequest', plugin.moduleName);
        const traceOptions = {
          name: `${request.method ? request.method : 'GET'}  ${
              arguments[0].pathname}`,
          type: 'CLIENT',
        };


        // Checks if this outgoing request is part of an operation by checking
        // if there is a current root span, if so, we create a child span. In
        // case there is no root span, this means that the outgoing request is
        // the first operation, therefore we create a root span.
        if (!plugin.tracer.currentRootSpan) {
          plugin.logger.debug('outgoingRequest starting a root span');
          return plugin.tracer.startRootSpan(
              traceOptions,
              plugin.makeRequestTrace(request, arguments, plugin));
        } else {
          plugin.logger.debug('outgoingRequest starting a child span');
          const span: types.Span = plugin.tracer.startChildSpan(
              traceOptions.name, traceOptions.type);
          return (span: types.Span) =>
                     plugin.makeRequestTrace(request, arguments, plugin);
        }
      };
    };
  }

  /**
   * Injects span's context to header for distributed tracing and finshes the
   * span when the response is finished.
   * @param original The original patched function.
   * @param args The arguments to the original function.
   */
  // tslint:disable:no-any
  makeRequestTrace(request: any, args: any, plugin: HttpPlugin): any {
    return (span: types.Span) => {
      plugin.logger.debug('makeRequestTrace');

      const headers = args[0].headers;
      const setter = {
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

      // tslint:disable:no-any
      const req = request.on('response', (response: any) => {
        plugin.tracer.wrapEmitter(response);
        plugin.logger.debug('outgoingRequest on response()');

        response.on('end', () => {
          plugin.logger.debug('outgoingRequest on end()');
          span.addAttribute('http.host', args[0].host);
          span.addAttribute('http.method', request.method);
          span.addAttribute('http.path', args[0].pathname);
          span.addAttribute('http.route', args[0].path);
          span.addAttribute(
              'http.user_agent', 'HTTPClient/' + request.httpVersion);
          span.addAttribute('http.status_code', request.statusCode);

          span.status = plugin.traceStatus(request.statusCode);

          // Message Event ID is not defined
          span.addMessageEvent(
              'MessageEventTypeSent', uuid.v4().split('-').join(''));

          span.end();
        });
      });
      plugin.tracer.wrapEmitter(req);

      plugin.logger.debug('makeRequestTrace retun request');
      return request;
    };
  }

  traceStatus(statusCode: number): number {
    if (statusCode < 200 || statusCode >= 400) {
      return traceStatusCodes.UNKNOWN;
    } else {
      switch (statusCode) {
        case (400):
          return traceStatusCodes.INVALID_ARGUMENT;
        case (504):
          return traceStatusCodes.DEADLINE_EXCEEDED;
        case (404):
          return traceStatusCodes.NOT_FOUND;
        case (403):
          return traceStatusCodes.PERMISSION_DENIED;
        case (401):
          return traceStatusCodes.UNAUTHENTICATED;
        case (429):
          return traceStatusCodes.RESOURCE_EXHAUSTED;
        case (501):
          return traceStatusCodes.UNIMPLEMENTED;
        case (503):
          return traceStatusCodes.UNAVAILABLE;
        default:
          return traceStatusCodes.OK;
      }
    }
  }
}

enum traceStatusCodes {
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
