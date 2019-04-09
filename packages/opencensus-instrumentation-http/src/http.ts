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

import {BasePlugin, CanonicalCode, Func, HeaderGetter, HeaderSetter, MessageEventType, Span, SpanKind, TagMap, TagTtl, TraceOptions} from '@opencensus/core';
import {ClientRequest, ClientResponse, IncomingMessage, request, RequestOptions, ServerResponse} from 'http';
import * as semver from 'semver';
import * as shimmer from 'shimmer';
import * as url from 'url';
import * as stats from './http-stats';
import {IgnoreMatcher} from './types';

export type HttpGetCallback = (res: IncomingMessage) => void;
export type RequestFunction = typeof request;

function isOpenCensusRequest(options: RequestOptions) {
  return options && options.headers &&
      !!options.headers['x-opencensus-outgoing-request'];
}

const UNLIMITED_PROPAGATION_MD = {
  tagTtl: TagTtl.UNLIMITED_PROPAGATION
};

/** Http instrumentation plugin for Opencensus */
export class HttpPlugin extends BasePlugin {
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

  /** Constructs a new HttpPlugin instance. */
  constructor(moduleName: string) {
    super(moduleName);
  }

  /** Patches HTTP incoming and outcoming request functions. */
  protected applyPatch() {
    this.logger.debug('applying patch to %s@%s', this.moduleName, this.version);

    shimmer.wrap(
        this.moduleExports, 'request', this.getPatchOutgoingRequestFunction());

    // In Node 8, http.get calls a private request method, therefore we patch it
    // here too.
    if (semver.satisfies(this.version, '>=8.0.0')) {
      shimmer.wrap(this.moduleExports, 'get', () => {
        // Re-implement http.get. This needs to be done (instead of using
        // getPatchOutgoingRequestFunction to patch it) because we need to
        // set the trace context header before the returned ClientRequest is
        // ended. The Node.js docs state that the only differences between
        // request and get are that (1) get defaults to the HTTP GET method and
        // (2) the returned request object is ended immediately. The former is
        // already true (at least in supported Node versions up to v9), so we
        // simply follow the latter. Ref:
        // https://nodejs.org/dist/latest/docs/api/http.html#http_http_get_options_callback
        // https://github.com/googleapis/cloud-trace-nodejs/blob/master/src/plugins/plugin-http.ts#L198
        return function getTrace(
            options: RequestOptions|string, callback: HttpGetCallback) {
          const req = request(options, callback);
          req.end();
          return req;
        };
      });
    }

    if (this.moduleExports && this.moduleExports.Server &&
        this.moduleExports.Server.prototype) {
      shimmer.wrap(
          this.moduleExports.Server.prototype, 'emit',
          this.getPatchIncomingRequestFunction());
    } else {
      this.logger.error(
          'Could not apply patch to %s.emit. Interface is not as expected.',
          this.moduleName);
    }

    return this.moduleExports;
  }

  /** Unpatches all HTTP patched function. */
  protected applyUnpatch(): void {
    shimmer.unwrap(this.moduleExports, 'request');
    if (semver.satisfies(this.version, '>=8.0.0')) {
      shimmer.unwrap(this.moduleExports, 'get');
    }
    if (this.moduleExports && this.moduleExports.Server &&
        this.moduleExports.Server.prototype) {
      shimmer.unwrap(this.moduleExports.Server.prototype, 'emit');
    }
  }

  /**
   * Check whether the given request is ignored by configuration
   * @param url URL of request
   * @param request Request to inspect
   * @param list List of ignore patterns
   */
  protected isIgnored<T>(
      url: string, request: T, list: Array<IgnoreMatcher<T>>): boolean {
    if (!list) {
      // No ignored urls - trace everything
      return false;
    }

    for (const pattern of list) {
      if (this.isSatisfyPattern(url, request, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check whether the given request match pattern
   * @param url URL of request
   * @param request Request to inspect
   * @param pattern Match pattern
   */
  protected isSatisfyPattern<T>(
      url: string, request: T, pattern: IgnoreMatcher<T>): boolean {
    if (typeof pattern === 'string') {
      return pattern === url;
    } else if (pattern instanceof RegExp) {
      return pattern.test(url);
    } else if (typeof pattern === 'function') {
      return pattern(url, request);
    } else {
      throw new TypeError('Pattern is in unsupported datatype');
    }
  }

  /**
   * Creates spans for incoming requests, restoring spans' context if applied.
   */
  protected getPatchIncomingRequestFunction() {
    return (original: (event: string) => boolean) => {
      const plugin = this;
      // This function's signature is that of an event listener, which can have
      // any number of variable-type arguments.
      // tslint:disable-next-line:no-any
      return function incomingRequest(event: string, ...args: any[]): boolean {
        // Only traces request events
        if (event !== 'request') {
          return original.apply(this, arguments);
        }
        const startTime = Date.now();
        const request: IncomingMessage = args[0];
        const response: ServerResponse = args[1];
        const path = request.url ? url.parse(request.url).pathname || '' : '';
        const method = request.method || 'GET';
        plugin.logger.debug('%s plugin incomingRequest', plugin.moduleName);

        if (plugin.isIgnored(
                path, request, plugin.options.ignoreIncomingPaths)) {
          return original.apply(this, arguments);
        }

        const propagation = plugin.tracer.propagation;
        const headers = request.headers;
        const getter: HeaderGetter = {
          getHeader(name: string) {
            return headers[name];
          }
        };

        const traceOptions: TraceOptions = {name: path, kind: SpanKind.SERVER};
        if (propagation) {
          const spanContext = propagation.extract(getter);
          if (spanContext) {
            traceOptions.spanContext = spanContext;
          }
        }

        return plugin.tracer.startRootSpan(traceOptions, rootSpan => {
          if (!rootSpan) return original.apply(this, arguments);

          plugin.tracer.wrapEmitter(request);
          plugin.tracer.wrapEmitter(response);

          // Wraps end (inspired by:
          // https://github.com/GoogleCloudPlatform/cloud-trace-nodejs/blob/master/src/plugins/plugin-connect.ts#L75)
          const originalEnd = response.end;

          response.end = function(this: ServerResponse) {
            response.end = originalEnd;
            const returned = response.end.apply(this, arguments);

            const requestUrl = request.url ? url.parse(request.url) : null;
            const host = headers.host || 'localhost';
            const userAgent =
                (headers['user-agent'] || headers['User-Agent']) as string;
            const tags = new TagMap();

            rootSpan.addAttribute(
                HttpPlugin.ATTRIBUTE_HTTP_HOST,
                host.replace(
                    /^(.*)(\:[0-9]{1,5})/,
                    '$1',
                    ));

            rootSpan.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_METHOD, method);
            if (requestUrl) {
              rootSpan.addAttribute(
                  HttpPlugin.ATTRIBUTE_HTTP_PATH, requestUrl.pathname || '');
              rootSpan.addAttribute(
                  HttpPlugin.ATTRIBUTE_HTTP_ROUTE, requestUrl.path || '');
              tags.set(
                  stats.HTTP_SERVER_ROUTE, {value: requestUrl.path || ''},
                  UNLIMITED_PROPAGATION_MD);
            }
            if (userAgent) {
              rootSpan.addAttribute(
                  HttpPlugin.ATTRIBUTE_HTTP_USER_AGENT, userAgent);
            }
            rootSpan.addAttribute(
                HttpPlugin.ATTRIBUTE_HTTP_STATUS_CODE,
                response.statusCode.toString());

            rootSpan.setStatus(
                HttpPlugin.parseResponseStatus(response.statusCode));
            rootSpan.addMessageEvent(MessageEventType.RECEIVED, 1);

            tags.set(
                stats.HTTP_SERVER_METHOD, {value: method},
                UNLIMITED_PROPAGATION_MD);
            tags.set(
                stats.HTTP_SERVER_STATUS,
                {value: response.statusCode.toString()},
                UNLIMITED_PROPAGATION_MD);
            HttpPlugin.recordStats(rootSpan.kind, tags, Date.now() - startTime);

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
  protected getPatchOutgoingRequestFunction() {
    return (original: Func<ClientRequest>): Func<ClientRequest> => {
      const plugin = this;
      return function outgoingRequest(
          options: RequestOptions|string, callback): ClientRequest {
        if (!options) {
          return original.apply(this, [options, callback]);
        }

        // Makes sure the url is an url object
        let pathname;
        let method;
        let origin = '';
        if (typeof (options) === 'string') {
          const parsedUrl = url.parse(options);
          options = parsedUrl;
          pathname = parsedUrl.pathname || '';
          origin = `${parsedUrl.protocol || 'http:'}//${parsedUrl.host}`;
        } else {
          // Do not trace ourselves
          if (isOpenCensusRequest(options)) {
            plugin.logger.debug(
                'header with "x-opencensus-outgoing-request" - do not trace');
            return original.apply(this, [options, callback]);
          }

          try {
            pathname = (options as url.URL).pathname;
            if (!pathname) {
              pathname = options.path ? url.parse(options.path).pathname : '';
            }
            method = options.method || 'GET';
            origin = `${options.protocol || 'http:'}//${options.host}`;
          } catch (ignore) {
          }
        }

        const request: ClientRequest =
            original.apply(this, [options, callback]);

        if (plugin.isIgnored(
                origin + pathname, request,
                plugin.options.ignoreOutgoingUrls)) {
          return request;
        }

        plugin.tracer.wrapEmitter(request);

        plugin.logger.debug('%s plugin outgoingRequest', plugin.moduleName);
        const traceOptions = {
          name: `${method || 'GET'} ${pathname}`,
          kind: SpanKind.CLIENT,
        };

        // Checks if this outgoing request is part of an operation by checking
        // if there is a current root span, if so, we create a child span. In
        // case there is no root span, this means that the outgoing request is
        // the first operation, therefore we create a root span.
        if (!plugin.tracer.currentRootSpan) {
          plugin.logger.debug('outgoingRequest starting a root span');
          return plugin.tracer.startRootSpan(
              traceOptions,
              plugin.getMakeRequestTraceFunction(request, options, plugin));
        } else {
          plugin.logger.debug('outgoingRequest starting a child span');
          const span = plugin.tracer.startChildSpan(
              traceOptions.name, traceOptions.kind);
          return (plugin.getMakeRequestTraceFunction(request, options, plugin))(
              span);
        }
      };
    };
  }

  /**
   * Injects span's context to header for distributed tracing and finshes the
   * span when the response is finished.
   * @param original The original patched function.
   * @param options The arguments to the original function.
   */
  private getMakeRequestTraceFunction(
      request: ClientRequest, options: RequestOptions,
      plugin: HttpPlugin): Func<ClientRequest> {
    return (span: Span): ClientRequest => {
      const startTime = Date.now();
      plugin.logger.debug('makeRequestTrace');

      if (!span) {
        plugin.logger.debug('makeRequestTrace span is null');
        return request;
      }

      const setter: HeaderSetter = {
        setHeader(name: string, value: string) {
          // https://github.com/googleapis/cloud-trace-nodejs/pull/766
          if (plugin.hasExpectHeader(options) && options.headers) {
            options.headers[name] = value;
          } else {
            request.setHeader(name, value);
          }
        }
      };

      const propagation = plugin.tracer.propagation;
      if (propagation) {
        // If outgoing request headers contain the "Expect" header, the returned
        // ClientRequest will throw an error if any new headers are added. For
        // this reason, only in this scenario, we opt to clone the options
        // object to inject the trace context header instead of using
        // ClientRequest#setHeader. (We don't do this generally because cloning
        // the options object is an expensive operation.)
        // https://github.com/googleapis/cloud-trace-nodejs/pull/766
        if (options.headers && plugin.hasExpectHeader(options)) {
          options = Object.assign({}, options) as RequestOptions;
          options.headers = Object.assign({}, options.headers);
        }
        propagation.inject(setter, span.spanContext);
      }

      request.on('response', (response: ClientResponse) => {
        plugin.tracer.wrapEmitter(response);
        plugin.logger.debug('outgoingRequest on response()');
        response.on('end', () => {
          plugin.logger.debug('outgoingRequest on end()');
          const method = response.method ? response.method : 'GET';
          const headers = options.headers;
          const userAgent =
              headers ? (headers['user-agent'] || headers['User-Agent']) : null;

          const tags = new TagMap();
          tags.set(stats.HTTP_CLIENT_METHOD, {value: method});

          const host = options.hostname || options.host || 'localhost';
          span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_HOST, host);
          span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_METHOD, method);
          if (options.path) {
            span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_PATH, options.path);
            span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_ROUTE, options.path);
          }

          if (userAgent) {
            span.addAttribute(
                HttpPlugin.ATTRIBUTE_HTTP_USER_AGENT, userAgent.toString());
          }
          if (response.statusCode) {
            span.addAttribute(
                HttpPlugin.ATTRIBUTE_HTTP_STATUS_CODE,
                response.statusCode.toString());
            span.setStatus(HttpPlugin.parseResponseStatus(response.statusCode));
            tags.set(
                stats.HTTP_CLIENT_STATUS,
                {value: response.statusCode.toString()});
          }
          span.addMessageEvent(MessageEventType.SENT, 1);

          HttpPlugin.recordStats(span.kind, tags, Date.now() - startTime);
          span.end();
        });

        response.on('error', error => {
          span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_ERROR_NAME, error.name);
          span.addAttribute(
              HttpPlugin.ATTRIBUTE_HTTP_ERROR_MESSAGE, error.message);
          span.setStatus(CanonicalCode.UNKNOWN, error.message);
          span.end();
        });
      });

      request.on('error', error => {
        span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_ERROR_NAME, error.name);
        span.addAttribute(
            HttpPlugin.ATTRIBUTE_HTTP_ERROR_MESSAGE, error.message);
        span.setStatus(CanonicalCode.UNKNOWN, error.message);
        span.end();
      });

      plugin.logger.debug('makeRequestTrace return request');
      return request;
    };
  }

  /**
   * Parse OpenCensus Status from HTTP response status code.
   * @param statusCode The HTTP response status code.
   */
  static parseResponseStatus(statusCode: number): number {
    if (statusCode < 200 || statusCode > 504) {
      return CanonicalCode.UNKNOWN;
    } else if (statusCode >= 200 && statusCode < 400) {
      return CanonicalCode.OK;
    } else {
      switch (statusCode) {
        case (400):
          return CanonicalCode.INVALID_ARGUMENT;
        case (504):
          return CanonicalCode.DEADLINE_EXCEEDED;
        case (404):
          return CanonicalCode.NOT_FOUND;
        case (403):
          return CanonicalCode.PERMISSION_DENIED;
        case (401):
          return CanonicalCode.UNAUTHENTICATED;
        case (429):
          return CanonicalCode.RESOURCE_EXHAUSTED;
        case (501):
          return CanonicalCode.UNIMPLEMENTED;
        case (503):
          return CanonicalCode.UNAVAILABLE;
        default:
          return CanonicalCode.UNKNOWN;
      }
    }
  }

  /** Method to record stats for client and server. */
  static recordStats(kind: SpanKind, tags: TagMap, ms: number) {
    if (!plugin.stats) return;

    try {
      const measureList = [];
      switch (kind) {
        case SpanKind.CLIENT:
          measureList.push(
              {measure: stats.HTTP_CLIENT_ROUNDTRIP_LATENCY, value: ms});
          break;
        case SpanKind.SERVER:
          measureList.push({measure: stats.HTTP_SERVER_LATENCY, value: ms});
          break;
        default:
          break;
      }
      plugin.stats.record(measureList, tags);
    } catch (ignore) {
    }
  }

  /**
   * Returns whether the Expect header is on the given options object.
   * @param options Options for http.request.
   */
  hasExpectHeader(options: RequestOptions|url.URL): boolean {
    return !!(
        (options as RequestOptions).headers &&
        (options as RequestOptions).headers!.Expect);
  }
}

const plugin = new HttpPlugin('http');
export {plugin};
