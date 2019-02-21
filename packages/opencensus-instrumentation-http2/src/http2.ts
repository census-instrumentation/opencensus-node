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

import {Func, HeaderGetter, HeaderSetter, MessageEventType, Span, SpanKind, TraceOptions, Tracer} from '@opencensus/core';
import {HttpPlugin} from '@opencensus/instrumentation-http';
import * as http from 'http';
import * as http2 from 'http2';
import * as net from 'net';
import * as shimmer from 'shimmer';
import * as tls from 'tls';
import * as url from 'url';
import * as uuid from 'uuid';

export type Http2Module = typeof http2;
export type ConnectFunction = typeof http2.connect;
type RequestFunction =
    (this: http2.ClientHttp2Session, headers?: http2.OutgoingHttpHeaders,
     options?: http2.ClientSessionRequestOptions) => http2.ClientHttp2Stream;
export type CreateServerFunction = typeof http2.createServer;

/** Http2 instrumentation plugin for Opencensus */
export class Http2Plugin extends HttpPlugin {
  /** Constructs a new Http2Plugin instance. */
  constructor() {
    super('http2');
  }

  /**
   * Patches HTTP2 incoming and outcoming request functions.
   */
  protected applyPatch() {
    shimmer.wrap(
        this.moduleExports, 'createServer',
        this.getPatchCreateServerFunction());
    shimmer.wrap(
        this.moduleExports, 'createSecureServer',
        this.getPatchCreateServerFunction());

    shimmer.wrap(this.moduleExports, 'connect', this.getPatchConnectFunction());

    return this.moduleExports;
  }

  /** Unpatches all HTTP2 patched function. */
  protected applyUnpatch(): void {
    // Only Client and Server constructors will be unwrapped. Any existing
    // Client or Server instances will still trace
    shimmer.unwrap(this.moduleExports, 'createServer');
    shimmer.unwrap(this.moduleExports, 'createSecureServer');
    shimmer.unwrap(this.moduleExports, 'connect');
  }

  private getPatchConnectFunction() {
    const plugin = this;
    return (original: ConnectFunction): Func<http2.ClientHttp2Session> => {
      return function patchedConnect(this: Http2Plugin, authority: string):
          http2.ClientHttp2Session {
            const client = original.apply(this, arguments);
            shimmer.wrap(
                client, 'request',
                (original) =>
                    (plugin.getPatchRequestFunction())(original, authority));

            shimmer.unwrap(plugin.moduleExports, 'connect');

            return client;
          };
    };
  }

  private getPatchRequestFunction() {
    const plugin = this;
    return (original: RequestFunction,
            authority: string): Func<http2.ClientHttp2Stream> => {
      return function patchedRequest(
                 this: http2.Http2Session,
                 headers: http2.OutgoingHttpHeaders): http2.ClientHttp2Stream {
        // Do not trace ourselves
        if (headers['x-opencensus-outgoing-request']) {
          return original.apply(this, arguments);
        }

        const request = original.apply(this, arguments);
        plugin.tracer.wrapEmitter(request);

        const traceOptions = {
          name: `${headers[':method'] || 'GET'} ${headers[':path']}`,
          kind: SpanKind.CLIENT,
        };

        // Checks if this outgoing request is part of an operation by checking
        // if there is a current root span, if so, we create a child span. In
        // case there is no root span, this means that the outgoing request is
        // the first operation, therefore we create a root span.
        if (!plugin.tracer.currentRootSpan) {
          return plugin.tracer.startRootSpan(
              traceOptions,
              plugin.getMakeHttp2RequestTraceFunction(
                  request, headers, authority, plugin));
        } else {
          const span = plugin.tracer.startChildSpan(
              {name: traceOptions.name, kind: traceOptions.kind});
          return (plugin.getMakeHttp2RequestTraceFunction(
              request, headers, authority, plugin))(span);
        }
      };
    };
  }

  private getMakeHttp2RequestTraceFunction(
      request: http2.ClientHttp2Stream, headers: http2.OutgoingHttpHeaders,
      authority: string, plugin: Http2Plugin): Func<http2.ClientHttp2Stream> {
    return (span: Span): http2.ClientHttp2Stream => {
      if (!span) return request;

      const setter: HeaderSetter = {
        setHeader(name: string, value: string) {
          headers[name] = value;
        }
      };

      const propagation = plugin.tracer.propagation;
      if (propagation) {
        propagation.inject(setter, span.spanContext);
      }

      request.on('response', (responseHeaders: http2.IncomingHttpHeaders) => {
        span.addAttribute(
            Http2Plugin.ATTRIBUTE_HTTP_STATUS_CODE,
            `${responseHeaders[':status']}`);
        span.setStatus(
            Http2Plugin.parseResponseStatus(+responseHeaders[':status']));
      });

      request.on('end', () => {
        const userAgent =
            headers['user-agent'] || headers['User-Agent'] || null;

        span.addAttribute(
            Http2Plugin.ATTRIBUTE_HTTP_HOST, url.parse(authority).host);
        span.addAttribute(
            Http2Plugin.ATTRIBUTE_HTTP_METHOD, `${headers[':method']}`);
        span.addAttribute(
            Http2Plugin.ATTRIBUTE_HTTP_PATH, `${headers[':path']}`);
        span.addAttribute(
            Http2Plugin.ATTRIBUTE_HTTP_ROUTE, `${headers[':path']}`);
        if (userAgent) {
          span.addAttribute(
              Http2Plugin.ATTRIBUTE_HTTP_USER_AGENT, `${userAgent}`);
        }

        span.addMessageEvent(
            MessageEventType.SENT, uuid.v4().split('-').join(''));

        span.end();
      });

      request.on('error', (err: Error) => {
        span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_ERROR_NAME, err.name);
        span.addAttribute(HttpPlugin.ATTRIBUTE_HTTP_ERROR_MESSAGE, err.message);

        span.end();
      });

      return request;
    };
  }

  private getPatchCreateServerFunction() {
    const plugin = this;
    return (original: CreateServerFunction): Func<http2.Http2Server> => {
      return function patchedCreateServer(this: Http2Plugin):
          http2.Http2Server {
            const server = original.apply(this, arguments);
            shimmer.wrap(
                server.constructor.prototype, 'emit',
                plugin.getPatchEmitFunction());

            shimmer.unwrap(plugin.moduleExports, 'createServer');
            shimmer.unwrap(plugin.moduleExports, 'createSecureServer');

            return server;
          };
    };
  }

  private getPatchEmitFunction() {
    const plugin = this;
    return (original: RequestFunction): Func<http2.ClientHttp2Stream> => {
      return function patchedEmit(
                 this: http2.Http2Server, event: string,
                 stream: http2.ServerHttp2Stream,
                 headers: http2.IncomingHttpHeaders): http2.ClientHttp2Stream {
        if (event !== 'stream') {
          return original.apply(this, arguments);
        }

        const propagation = plugin.tracer.propagation;
        const getter = {
          getHeader(name: string) {
            return headers[name];
          }
        } as HeaderGetter;

        const traceOptions = {
          name: headers[':path'],
          kind: SpanKind.SERVER,
          spanContext: propagation ? propagation.extract(getter) : null
        } as TraceOptions;

        // Respond is called in a stream event. We wrap it to get the sent
        // status code.
        let statusCode: number = null;
        const originalRespond = stream.respond;
        stream.respond = function(this: http2.Http2Stream) {
          // Unwrap it since respond is not allowed to be called more than once
          // per stream.
          stream.respond = originalRespond;
          statusCode = arguments[0][':status'];
          return stream.respond.apply(this, arguments);
        };

        return plugin.tracer.startRootSpan(traceOptions, rootSpan => {
          if (!rootSpan) return original.apply(this, arguments);

          plugin.tracer.wrapEmitter(stream);

          const originalEnd = stream.end;
          stream.end = function(this: http2.Http2Stream) {
            stream.end = originalEnd;
            const returned = stream.end.apply(this, arguments);

            const userAgent = (headers['user-agent'] || headers['User-Agent'] ||
                               null) as string;

            rootSpan.addAttribute(
                Http2Plugin.ATTRIBUTE_HTTP_HOST, `${headers[':authority']}`);
            rootSpan.addAttribute(
                Http2Plugin.ATTRIBUTE_HTTP_METHOD, `${headers[':method']}`);
            rootSpan.addAttribute(
                Http2Plugin.ATTRIBUTE_HTTP_PATH, `${headers[':path']}`);
            rootSpan.addAttribute(
                Http2Plugin.ATTRIBUTE_HTTP_ROUTE, `${headers[':path']}`);
            rootSpan.addAttribute(
                Http2Plugin.ATTRIBUTE_HTTP_USER_AGENT, userAgent);
            rootSpan.addAttribute(
                Http2Plugin.ATTRIBUTE_HTTP_STATUS_CODE, `${statusCode}`);
            rootSpan.setStatus(Http2Plugin.parseResponseStatus(statusCode));

            rootSpan.addMessageEvent(
                MessageEventType.RECEIVED, uuid.v4().split('-').join(''));

            rootSpan.end();
            return returned;
          };

          return original.apply(this, arguments);
        });
      };
    };
  }
}

const plugin = new Http2Plugin();
export {plugin};
