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
import * as assert from 'assert';
import * as http2 from 'http2';
import * as mocha from 'mocha';
import * as semver from 'semver';
import * as shimmer from 'shimmer';

import {plugin} from '../src/';
import {Http2Plugin} from '../src/';

const VERSION = process.versions.node;

class RootSpanVerifier implements types.SpanEventListener {
  endedRootSpans: types.RootSpan[] = [];

  onStartSpan(root: types.RootSpan): void {}
  onEndSpan(root: types.RootSpan) {
    this.endedRootSpans.push(root);
  }
}

function assertSpanAttributes(
    span: types.Span, httpStatusCode: number, httpMethod: string,
    hostName: string, path: string, userAgent: string) {
  assert.strictEqual(span.status, plugin.traceStatus(httpStatusCode));
  assert.strictEqual(
      span.attributes[Http2Plugin.ATTRIBUTE_HTTP_HOST], hostName);
  assert.strictEqual(
      span.attributes[Http2Plugin.ATTRIBUTE_HTTP_METHOD], httpMethod);
  assert.strictEqual(span.attributes[Http2Plugin.ATTRIBUTE_HTTP_PATH], path);
  assert.strictEqual(span.attributes[Http2Plugin.ATTRIBUTE_HTTP_ROUTE], path);
  assert.strictEqual(
      span.attributes[Http2Plugin.ATTRIBUTE_HTTP_USER_AGENT], userAgent);
  assert.strictEqual(
      span.attributes[Http2Plugin.ATTRIBUTE_HTTP_STATUS_CODE],
      `${httpStatusCode}`);
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
    }
  };

  let server: http2.Http2Server;
  let client: http2.ClientHttp2Session;
  const serverPort = 8080;
  const host = `localhost:${serverPort}`;
  const authority = `http://${host}`;

  const log = logger.logger();
  const tracer = new classes.Tracer();
  const rootSpanVerifier = new RootSpanVerifier();
  tracer.start({samplingRate: 1, logger: log});

  it('should return a plugin', () => {
    assert.ok(plugin instanceof Http2Plugin);
  });

  before(() => {
    tracer.registerSpanEventListener(rootSpanVerifier);

    plugin.applyPatch(http2, tracer, VERSION);
    server = http2.createServer();
    server.on('stream', (stream, requestHeaders) => {
      const statusCode = requestHeaders[':path'].length > 1 ?
          +requestHeaders[':path'].slice(1) :
          200;
      stream.respond({':status': statusCode, 'content-type': 'text/plain'});
      stream.end(`${statusCode}`);
    });
    server.listen(serverPort);

    client = http2.connect(authority);
  });

  beforeEach(() => {
    rootSpanVerifier.endedRootSpans = [];
  });

  after(() => {
    server.close();
    client.destroy();
  });


  /** Should intercept outgoing requests */
  describe('Instrumenting outgoing requests', () => {
    it('should create a rootSpan for GET requests as a client', async () => {
      const statusCode = 200;
      const testPath = `/${statusCode}`;
      const requestOptions = {':method': 'GET', ':path': testPath};
      assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);

      await http2Request.get(client, requestOptions).then((result) => {
        assert.strictEqual(result, `${statusCode}`);
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 2);
        assert.ok(
            rootSpanVerifier.endedRootSpans[1].name.indexOf(testPath) >= 0);

        const span = rootSpanVerifier.endedRootSpans[1];
        assertSpanAttributes(span, 200, 'GET', host, testPath, undefined);
      });
    });

    const httpErrorCodes = [400, 401, 403, 404, 429, 501, 503, 504, 500];

    httpErrorCodes.map(errorCode => {
      it(`should test rootSpan for GET requests with http error ${errorCode}`,
         async () => {
           const testPath = `/${errorCode}`;
           const requestOptions = {':method': 'GET', ':path': testPath};
           assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);

           await http2Request.get(client, requestOptions).then((result) => {
             assert.strictEqual(result, errorCode.toString());
             assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 2);
             assert.ok(
                 rootSpanVerifier.endedRootSpans[1].name.indexOf(testPath) >=
                 0);

             const span = rootSpanVerifier.endedRootSpans[1];
             assertSpanAttributes(
                 span, errorCode, 'GET', host, testPath, undefined);
           });
         });
    });

    it('should create a child span for GET requests', () => {
      const statusCode = 200;
      const testPath = `/${statusCode}`;
      const requestOptions = {':method': 'GET', ':path': testPath};
      const options = {name: 'TestRootSpan'};

      return tracer.startRootSpan(options, async root => {
        await http2Request.get(client, requestOptions).then((result) => {
          assert.ok(root.name.indexOf('TestRootSpan') >= 0);
          assert.strictEqual(root.spans.length, 1);
          assert.ok(root.spans[0].name.indexOf(testPath) >= 0);
          assert.strictEqual(root.traceId, root.spans[0].traceId);
          const span = root.spans[0];
          assertSpanAttributes(
              span, statusCode, 'GET', host, testPath, undefined);
        });
      });
    });

    httpErrorCodes.map(errorCode => {
      it(`should test a child spans for GET requests with http error ${
             errorCode}`,
         () => {
           const testPath = `/${errorCode}`;
           const requestOptions = {':method': 'GET', ':path': testPath};
           const options = {name: 'TestRootSpan'};

           return tracer.startRootSpan(options, async root => {
             await http2Request.get(client, requestOptions).then((result) => {
               assert.ok(root.name.indexOf('TestRootSpan') >= 0);
               assert.strictEqual(root.spans.length, 1);
               assert.ok(root.spans[0].name.indexOf(testPath) >= 0);
               assert.strictEqual(root.traceId, root.spans[0].traceId);

               const span = root.spans[0];
               assertSpanAttributes(
                   span, errorCode, 'GET', host, testPath, undefined);
             });
           });
         });
    });

    it('should create multiple child spans for GET requests', () => {
      const statusCode = 200;
      const testPath = `/${statusCode}`;
      const requestOptions = {':method': 'GET', ':path': testPath};
      const num = 5;
      const options = {name: 'TestRootSpan'};

      return tracer.startRootSpan(options, async root => {
        assert.ok(root.name.indexOf('TestRootSpan') >= 0);
        for (let i = 0; i < num; i++) {
          await http2Request.get(client, requestOptions).then((result) => {
            assert.strictEqual(root.spans.length, i + 1);
            assert.ok(root.spans[i].name.indexOf(testPath) >= 0);
            assert.strictEqual(root.traceId, root.spans[i].traceId);
          });
        }
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, num);
        root.end();
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1 + num);
      });
    });

    it('should not trace requests with \'x-opencensus-outgoing-request\' header',
       async () => {
         const statusCode = 200;
         const testPath = `/${statusCode}`;
         const requestOptions = {
           ':method': 'GET',
           ':path': testPath,
           'x-opencensus-outgoing-request': 1
         };

         assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
         await http2Request.get(client, requestOptions).then((result) => {
           assert.strictEqual(result, `${statusCode}`);
           assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
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
        'User-Agent': 'Android'
      };

      assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);

      await http2Request.get(client, requestOptions).then((result) => {
        assert.ok(
            rootSpanVerifier.endedRootSpans[0].name.indexOf(testPath) >= 0);
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 2);
        const span = rootSpanVerifier.endedRootSpans[0];
        assertSpanAttributes(span, 200, 'GET', host, testPath, 'Android');
      });
    });
  });
});
