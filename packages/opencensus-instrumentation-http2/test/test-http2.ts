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

import {
  CoreTracer,
  logger,
  MessageEventType,
  Span,
  SpanEventListener,
} from '@opencensus/core';
import * as assert from 'assert';
import * as http2 from 'http2';
import * as semver from 'semver';

import { Http2Plugin, plugin } from '../src/';
import { IncomingHttpHeaders, ServerHttp2Stream } from 'http2';
import { URL } from 'url';

const VERSION = process.versions.node;

class SpanVerifier implements SpanEventListener {
  endedSpans: Span[] = [];

  onStartSpan(span: Span): void {}
  onEndSpan(span: Span) {
    this.endedSpans.push(span);
  }
}

function assertSpanAttributes(
  span: Span,
  httpStatusCode: number,
  httpMethod: string,
  hostName: string,
  path: string,
  userAgent?: string
) {
  assert.strictEqual(
    span.status.code,
    Http2Plugin.parseResponseStatus(httpStatusCode)
  );
  assert.strictEqual(
    span.attributes[Http2Plugin.ATTRIBUTE_HTTP_HOST],
    hostName
  );
  assert.strictEqual(
    span.attributes[Http2Plugin.ATTRIBUTE_HTTP_METHOD],
    httpMethod
  );
  assert.strictEqual(span.attributes[Http2Plugin.ATTRIBUTE_HTTP_PATH], path);
  assert.strictEqual(span.attributes[Http2Plugin.ATTRIBUTE_HTTP_ROUTE], path);
  if (userAgent) {
    assert.strictEqual(
      span.attributes[Http2Plugin.ATTRIBUTE_HTTP_USER_AGENT],
      userAgent
    );
  }
  assert.strictEqual(
    span.attributes[Http2Plugin.ATTRIBUTE_HTTP_STATUS_CODE],
    `${httpStatusCode}`
  );
}

describe('Http2Plugin', () => {
  if (semver.satisfies(process.version, '<8')) {
    console.log(`Skipping test-http2 on Node.js version ${process.version}`);
    return;
  }

  const http2 = require('http2');

  const http2Request = {
    get: (client: http2.ClientHttp2Session, options: {}) => {
      return new Promise((resolve, reject) => {
        const request = client.request(options);
        let data = '';
        request.on('data', chunk => {
          data += chunk;
        });
        request.on('end', () => {
          resolve(data);
        });
        request.on('error', err => {
          reject(err);
        });
      });
    },
    getAndAssertRootSpanExistence: (
      client: http2.ClientHttp2Session,
      options: {}
    ) => {
      return new Promise((resolve, reject) => {
        const req = client.request(options);
        req.on('response', headers => {
          assert.ok(tracer.currentRootSpan);
        });
        let data = '';
        req.on('data', chunk => {
          data += chunk;
        });
        req.on('end', () => resolve(data));
        req.on('error', err => reject(err));
      });
    },
  };

  let server: http2.Http2Server;
  let server2: http2.Http2Server;
  let client: http2.ClientHttp2Session;
  let client2: http2.ClientHttp2Session;
  const serverPort = 8080;
  const serverPort2 = 8081;
  const host = `localhost:${serverPort}`;
  const authority = `http://${host}`;
  const authorityUrlObject = new URL('/', `http://${host}/`);

  const log = logger.logger();
  const tracer = new CoreTracer();
  const spanVerifier = new SpanVerifier();
  tracer.start({ samplingRate: 1, logger: log });

  it('should return a plugin', () => {
    assert.ok(plugin instanceof Http2Plugin);
  });

  before(() => {
    tracer.registerSpanEventListener(spanVerifier);

    plugin.enable(http2, tracer, VERSION, {}, '');
    const streamHandler = (
      stream: ServerHttp2Stream,
      requestHeaders: IncomingHttpHeaders
    ) => {
      const path = requestHeaders[':path'];
      let statusCode = 200;
      if (path && path.length > 1) {
        statusCode = isNaN(Number(path.slice(1))) ? 200 : Number(path.slice(1));
      }
      stream.respond({ ':status': statusCode, 'content-type': 'text/plain' });
      stream.end(`${statusCode}`);
    };
    server = http2.createServer();
    server.on('stream', streamHandler);
    server.listen(serverPort);

    server2 = http2.createServer();
    server2.on('stream', streamHandler);
    server2.listen(serverPort2);

    client = http2.connect(authority);
    client2 = http2.connect(authorityUrlObject);
  });

  beforeEach(() => {
    spanVerifier.endedSpans = [];
  });

  after(() => {
    server.close();
    server2.close();
    client.destroy();
    client2.destroy();
  });

  /** Should intercept outgoing requests */
  describe('Instrumenting outgoing requests', () => {
    it('should create a rootSpan for GET requests as a client', async () => {
      const statusCode = 200;
      const testPath = `/${statusCode}`;
      const requestOptions = { ':method': 'GET', ':path': testPath };
      assert.strictEqual(spanVerifier.endedSpans.length, 0);

      await http2Request.get(client, requestOptions).then(result => {
        assert.strictEqual(result, `${statusCode}`);
        assert.strictEqual(spanVerifier.endedSpans.length, 2);
        assert.ok(spanVerifier.endedSpans[1].name.indexOf(testPath) >= 0);

        const span = spanVerifier.endedSpans[1];
        assertSpanAttributes(span, 200, 'GET', host, testPath);
        assert.strictEqual(span.messageEvents.length, 1);
        assert.strictEqual(span.messageEvents[0].type, MessageEventType.SENT);
        assert.strictEqual(span.messageEvents[0].id, 1);

        const messageEvents = spanVerifier.endedSpans[0].messageEvents[0];
        assert.strictEqual(messageEvents.type, MessageEventType.RECEIVED);
        assert.strictEqual(messageEvents.id, 1);
      });
    });

    it('should succeed when the client is connected using the url.URL object (#640)', async () => {
      const statusCode = 200;
      const testPath = `/${statusCode}`;
      const requestOptions = {
        ':method': 'GET',
        ':path': testPath,
      };

      assert.strictEqual(spanVerifier.endedSpans.length, 0);

      await http2Request.get(client2, requestOptions).then(result => {
        assert.strictEqual(result, statusCode.toString());
        assert.strictEqual(spanVerifier.endedSpans.length, 2);
        const span = spanVerifier.endedSpans[1];
        assertSpanAttributes(span, statusCode, 'GET', host, testPath);
      });
    });

    const httpErrorCodes = [400, 401, 403, 404, 429, 501, 503, 504, 500];

    httpErrorCodes.map(errorCode => {
      it(`should test rootSpan for GET requests with http error ${errorCode}`, async () => {
        const testPath = `/${errorCode}`;
        const requestOptions = { ':method': 'GET', ':path': testPath };
        assert.strictEqual(spanVerifier.endedSpans.length, 0);

        await http2Request.get(client, requestOptions).then(result => {
          assert.strictEqual(result, errorCode.toString());
          assert.strictEqual(spanVerifier.endedSpans.length, 2);
          assert.ok(spanVerifier.endedSpans[1].name.indexOf(testPath) >= 0);

          const span = spanVerifier.endedSpans[1];
          assertSpanAttributes(span, errorCode, 'GET', host, testPath);
        });
      });
    });

    it('should create a child span for GET requests', () => {
      const statusCode = 200;
      const testPath = `/${statusCode}`;
      const requestOptions = { ':method': 'GET', ':path': testPath };
      const options = { name: 'TestRootSpan' };

      return tracer.startRootSpan(options, async (root: Span) => {
        await http2Request.get(client, requestOptions).then(result => {
          assert.ok(root.name.indexOf('TestRootSpan') >= 0);
          assert.strictEqual(root.spans.length, 1);
          assert.ok(root.spans[0].name.indexOf(testPath) >= 0);
          assert.strictEqual(root.traceId, root.spans[0].traceId);
          const span = root.spans[0];
          assertSpanAttributes(span, statusCode, 'GET', host, testPath);
        });
      });
    });

    httpErrorCodes.map(errorCode => {
      it(`should test a child spans for GET requests with http error ${errorCode}`, () => {
        const testPath = `/${errorCode}`;
        const requestOptions = { ':method': 'GET', ':path': testPath };
        const options = { name: 'TestRootSpan' };

        return tracer.startRootSpan(options, async (root: Span) => {
          await http2Request.get(client, requestOptions).then(result => {
            assert.ok(root.name.indexOf('TestRootSpan') >= 0);
            assert.strictEqual(root.spans.length, 1);
            assert.ok(root.spans[0].name.indexOf(testPath) >= 0);
            assert.strictEqual(root.traceId, root.spans[0].traceId);

            const span = root.spans[0];
            assertSpanAttributes(span, errorCode, 'GET', host, testPath);
          });
        });
      });
    });

    it('should create multiple child spans for GET requests', () => {
      const statusCode = 200;
      const testPath = `/${statusCode}`;
      const requestOptions = { ':method': 'GET', ':path': testPath };
      const num = 5;
      const options = { name: 'TestRootSpan' };

      return tracer.startRootSpan(options, async (root: Span) => {
        assert.ok(root.name.indexOf('TestRootSpan') >= 0);
        for (let i = 0; i < num; i++) {
          await http2Request.get(client, requestOptions).then(result => {
            assert.strictEqual(root.spans.length, i + 1);
            assert.ok(root.spans[i].name.indexOf(testPath) >= 0);
            assert.strictEqual(root.traceId, root.spans[i].traceId);
          });
        }
        // 5 child spans ended (+ super class ends)
        assert.strictEqual(spanVerifier.endedSpans.length, 2 * num);
        root.end();
        // 5 child spans + root span ended (+ super class ends)
        assert.strictEqual(spanVerifier.endedSpans.length, 1 + 2 * num);
      });
    });

    it("should not trace requests with 'x-opencensus-outgoing-request' header", async () => {
      const statusCode = 200;
      const testPath = `/${statusCode}`;
      const requestOptions = {
        ':method': 'GET',
        ':path': testPath,
        'x-opencensus-outgoing-request': 1,
      };

      assert.strictEqual(spanVerifier.endedSpans.length, 0);
      await http2Request.get(client, requestOptions).then(result => {
        assert.strictEqual(result, `${statusCode}`);
        assert.strictEqual(spanVerifier.endedSpans.length, 1);
      });
    });

    it('should work correctly even when multiple clients are used', async () => {
      const statusCode = 200;
      const testPath = `/${statusCode}`;
      const requestOptions = { ':method': 'GET', ':path': testPath };
      const options = { name: 'TestRootSpan' };

      assert.strictEqual(spanVerifier.endedSpans.length, 0);
      await tracer.startRootSpan(options, async () => {
        assert.ok(tracer.currentRootSpan);
        await http2Request.getAndAssertRootSpanExistence(
          client,
          requestOptions
        );
      });

      assert.strictEqual(spanVerifier.endedSpans.length, 2);
      return tracer.startRootSpan(options, async () => {
        assert.ok(tracer.currentRootSpan);
        await http2Request.getAndAssertRootSpanExistence(
          client2,
          requestOptions
        );
      });
    });
  });

  /** Should intercept incoming requests */
  describe('Instrumenting incoming requests', () => {
    it('should create a root span for incoming requests', async () => {
      const statusCode = 200;
      const testPath = `/${statusCode}`;
      const requestOptions = {
        ':method': 'GET',
        ':path': testPath,
        'User-Agent': 'Android',
      };

      assert.strictEqual(spanVerifier.endedSpans.length, 0);

      await http2Request.get(client, requestOptions).then(result => {
        assert.ok(spanVerifier.endedSpans[0].name.indexOf(testPath) >= 0);
        assert.strictEqual(spanVerifier.endedSpans.length, 2);
        const span = spanVerifier.endedSpans[0];
        assertSpanAttributes(span, 200, 'GET', host, testPath, 'Android');
      });
    });
  });
});
