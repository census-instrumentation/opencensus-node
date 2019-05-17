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

import {CoreTracer, logger, Span, SpanEventListener, SpanKind} from '@opencensus/core';
import * as assert from 'assert';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as nock from 'nock';
import * as shimmer from 'shimmer';

import {plugin} from '../src/';
import {HttpsPlugin} from '../src/';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function doNock(
    url: string, path: string, httpCode: number, respBody: string,
    times?: number) {
  const i = times || 1;
  nock(url).get(path).times(i).reply(httpCode, respBody);
}

function customAttributeFunction(
    span: Span, request: http.ClientRequest|http.IncomingMessage,
    response: http.IncomingMessage|http.ServerResponse): void {
  span.addAttribute('span kind', span.kind);
}

type RequestFunction = typeof https.request|typeof https.get;

const httpRequest = {
  request: (options: {}|string) => {
    return httpRequest.make(options, https.request);
  },
  get: (options: {}|string) => {
    return httpRequest.make(options, https.get);
  },
  make: (options: {}|string, method: RequestFunction) => {
    return new Promise((resolve, reject) => {
      const req = method(options, resp => {
        let data = '';
        resp.on('data', chunk => {
          data += chunk;
        });
        resp.on('end', () => {
          resolve(data);
        });
        resp.on('error', err => {
          reject(err);
        });
      });
      req.end();
    });
  },
};

const VERSION = process.versions.node;

class SpanVerifier implements SpanEventListener {
  endedSpans: Span[] = [];

  onStartSpan(span: Span): void {}
  onEndSpan(span: Span) {
    this.endedSpans.push(span);
  }
}

const httpsOptions = {
  key: fs.readFileSync('./test/fixtures/key.pem'),
  cert: fs.readFileSync('./test/fixtures/cert.pem')
};

function assertSpanAttributes(
    span: Span, httpStatusCode: number, httpMethod: string, hostName: string,
    path: string, userAgent?: string) {
  assert.strictEqual(
      span.status.code, HttpsPlugin.parseResponseStatus(httpStatusCode));
  assert.strictEqual(
      span.attributes[HttpsPlugin.ATTRIBUTE_HTTP_HOST], hostName);
  assert.strictEqual(
      span.attributes[HttpsPlugin.ATTRIBUTE_HTTP_METHOD], httpMethod);
  assert.strictEqual(span.attributes[HttpsPlugin.ATTRIBUTE_HTTP_PATH], path);
  assert.strictEqual(span.attributes[HttpsPlugin.ATTRIBUTE_HTTP_ROUTE], path);
  if (userAgent) {
    assert.strictEqual(
        span.attributes[HttpsPlugin.ATTRIBUTE_HTTP_USER_AGENT], userAgent);
  }
  assert.strictEqual(
      span.attributes[HttpsPlugin.ATTRIBUTE_HTTP_STATUS_CODE],
      `${httpStatusCode}`);
}

function assertCustomAttribute(
    span: Span, attributeName: string, attributeValue: SpanKind) {
  assert.strictEqual(span.attributes[attributeName], attributeValue);
}

describe('HttpsPlugin', () => {
  const hostName = 'fake.service.io';
  const urlHost = `https://${hostName}`;
  let serverPort = 3000;

  let server: https.Server;
  const log = logger.logger();
  const tracer = new CoreTracer();
  const spanVerifier = new SpanVerifier();
  tracer.start({samplingRate: 1, logger: log});

  it('should return a plugin', () => {
    assert.ok(plugin instanceof HttpsPlugin);
  });

  before(() => {
    plugin.enable(
        https, tracer, VERSION, {
          ignoreIncomingPaths: [
            '/ignored/string', /^\/ignored\/regexp/,
            (url: string) => url === '/ignored/function'
          ],
          ignoreOutgoingUrls: [
            `${urlHost}/ignored/string`,
            /^https:\/\/fake\.service\.io\/ignored\/regexp$/,
            (url: string) => url === `${urlHost}/ignored/function`
          ],
          applyCustomAttributesOnSpan: customAttributeFunction,
        },
        '');
    tracer.registerSpanEventListener(spanVerifier);
    server = https.createServer(httpsOptions, (request, response) => {
      response.end('Test Server Response');
    });
    server.listen(serverPort);
    server.once('listening', () => {
      // to fix node 6 issue
      // disable-next-line to disable no-any check
      // tslint:disable-next-line
      serverPort = (server.address() as any).port;
    });
    nock.disableNetConnect();
  });

  beforeEach(() => {
    spanVerifier.endedSpans = [];
    nock.cleanAll();
  });

  after(() => {
    server.close();
  });

  const methods = [httpRequest.get, httpRequest.request];

  describe('Instrumenting outgoing requests', () => {
    methods.map(requestMethod => {
      /** Should intercept outgoing requests */
      describe(`Testing https.${requestMethod.name}() method`, () => {
        it('should create a rootSpan for GET requests as a client',
           async () => {
             const testPath = '/outgoing/rootSpan/1';
             doNock(urlHost, testPath, 200, 'Ok');
             assert.strictEqual(spanVerifier.endedSpans.length, 0);
             await requestMethod(`${urlHost}${testPath}`).then((result) => {
               assert.strictEqual(result, 'Ok');
               assert.ok(
                   spanVerifier.endedSpans[0].name.indexOf(testPath) >= 0);
               assert.strictEqual(spanVerifier.endedSpans.length, 1);

               const span = spanVerifier.endedSpans[0];
               assertSpanAttributes(span, 200, 'GET', hostName, testPath);
             });
           });

        const httpErrorCodes = [400, 401, 403, 404, 429, 501, 503, 504, 500];

        for (let i = 0; i < httpErrorCodes.length; i++) {
          it(`should test rootSpan for GET requests with http error ${
                 httpErrorCodes[i]}`,
             async () => {
               const testPath = '/outgoing/rootSpan/1';
               doNock(
                   urlHost, testPath, httpErrorCodes[i],
                   httpErrorCodes[i].toString());
               assert.strictEqual(spanVerifier.endedSpans.length, 0);
               await requestMethod(`${urlHost}${testPath}`).then((result) => {
                 assert.strictEqual(result, httpErrorCodes[i].toString());
                 assert.ok(
                     spanVerifier.endedSpans[0].name.indexOf(testPath) >= 0);
                 assert.strictEqual(spanVerifier.endedSpans.length, 1);
                 const span = spanVerifier.endedSpans[0];
                 assertSpanAttributes(
                     span, httpErrorCodes[i], 'GET', hostName, testPath);
               });
             });
        }


        it('should create a child span for GET requests', () => {
          const testPath = '/outgoing/rootSpan/childs/1';
          doNock(urlHost, testPath, 200, 'Ok');
          const options = {name: 'TestRootSpan'};
          return tracer.startRootSpan(options, async (root: Span) => {
            await requestMethod(`${urlHost}${testPath}`).then((result) => {
              assert.ok(root.name.indexOf('TestRootSpan') >= 0);
              assert.strictEqual(root.spans.length, 1);
              assert.ok(root.spans[0].name.indexOf(testPath) >= 0);
              assert.strictEqual(root.traceId, root.spans[0].traceId);
              const span = root.spans[0];
              assertSpanAttributes(span, 200, 'GET', hostName, testPath);
            });
          });
        });

        it('should create a child span for GET requests', async () => {
          const testPath = '/outgoing/rootSpan/childs/1';
          doNock(urlHost, testPath, 200, 'Ok');
          const options = {name: 'TestRootSpan'};
          return tracer.startRootSpan(options, async (root: Span) => {
            await requestMethod(`${urlHost}${testPath}`).then((result) => {
              assert.ok(root.name.indexOf('TestRootSpan') >= 0);
              assert.strictEqual(root.spans.length, 1);
              assert.ok(root.spans[0].name.indexOf(testPath) >= 0);
              assert.strictEqual(root.traceId, root.spans[0].traceId);
              const span = root.spans[0];
              assertCustomAttribute(span, 'span kind', SpanKind.CLIENT);
            });
          });
        });

        for (let i = 0; i < httpErrorCodes.length; i++) {
          it(`should test a child spans for GET requests with http error ${
                 httpErrorCodes[i]}`,
             () => {
               const testPath = '/outgoing/rootSpan/childs/1';
               doNock(
                   urlHost, testPath, httpErrorCodes[i],
                   httpErrorCodes[i].toString());
               const options = {name: 'TestRootSpan'};
               return tracer.startRootSpan(options, async (root: Span) => {
                 await requestMethod(`${urlHost}${testPath}`).then((result) => {
                   assert.ok(root.name.indexOf('TestRootSpan') >= 0);
                   assert.strictEqual(root.spans.length, 1);
                   assert.ok(root.spans[0].name.indexOf(testPath) >= 0);
                   assert.strictEqual(root.traceId, root.spans[0].traceId);

                   const span = root.spans[0];
                   assertSpanAttributes(
                       span, httpErrorCodes[i], 'GET', hostName, testPath);
                 });
               });
             });
        }

        it('should create multiple child spans for GET requests', () => {
          const testPath = '/outgoing/rootSpan/childs';
          const num = 5;
          doNock(urlHost, testPath, 200, 'Ok', num);
          const options = {name: 'TestRootSpan'};
          return tracer.startRootSpan(options, async (root: Span) => {
            assert.ok(root.name.indexOf('TestRootSpan') >= 0);
            for (let i = 0; i < num; i++) {
              await requestMethod(`${urlHost}${testPath}`).then((result) => {
                assert.strictEqual(root.spans.length, i + 1);
                assert.ok(root.spans[i].name.indexOf(testPath) >= 0);
                assert.strictEqual(root.traceId, root.spans[i].traceId);
              });
            }
            // 5 child spans ended
            assert.strictEqual(spanVerifier.endedSpans.length, 5);
            root.end();
            // 5 child spans + root span ended
            assert.strictEqual(spanVerifier.endedSpans.length, 6);
          });
        });

        it('should not trace requests with \'x-opencensus-outgoing-request\' header',
           async () => {
             const testPath = '/outgoing/do-not-trace';
             doNock(urlHost, testPath, 200, 'Ok');

             const options = {
               host: hostName,
               path: testPath,
               headers: {'x-opencensus-outgoing-request': 1}
             };

             assert.strictEqual(spanVerifier.endedSpans.length, 0);
             await requestMethod(options).then((result) => {
               assert.equal(result, 'Ok');
               assert.strictEqual(spanVerifier.endedSpans.length, 0);
             });
           });

        for (const ignored of ['string', 'function', 'regexp']) {
          it(`should not trace ignored requests with type ${ignored}`,
             async () => {
               const testPath = `/ignored/${ignored}`;
               doNock(urlHost, testPath, 200, 'Ok');

               const options = {
                 host: hostName,
                 path: testPath,
               };

               assert.strictEqual(spanVerifier.endedSpans.length, 0);
               await httpRequest.get(options);
               assert.strictEqual(spanVerifier.endedSpans.length, 0);
             });
        }
      });
    });
  });


  /** Should intercept incoming requests */
  describe('Instrumenting incoming requests', () => {
    it('should create a root span for incoming requests', async () => {
      const testPath = '/incoming/rootSpan/';

      const options = {
        host: 'localhost',
        path: testPath,
        port: serverPort,
        headers: {'User-Agent': 'Android'}
      };
      nock.enableNetConnect();

      assert.strictEqual(spanVerifier.endedSpans.length, 0);

      await httpRequest.request(options).then((result) => {
        assert.ok(spanVerifier.endedSpans[0].name.indexOf(testPath) >= 0);
        assert.strictEqual(spanVerifier.endedSpans.length, 2);
        const span = spanVerifier.endedSpans[0];
        assertSpanAttributes(
            span, 200, 'GET', 'localhost', testPath, 'Android');
      });
    });

    it('custom attributes should show up on server spans', async () => {
      const testPath = '/incoming/rootSpan/';

      const options = {
        host: 'localhost',
        path: testPath,
        port: serverPort,
        headers: {'User-Agent': 'Android'}
      };
      nock.enableNetConnect();

      assert.strictEqual(spanVerifier.endedSpans.length, 0);

      await httpRequest.request(options).then((result) => {
        assert.ok(spanVerifier.endedSpans[0].name.indexOf(testPath) >= 0);
        assert.strictEqual(spanVerifier.endedSpans.length, 2);
        const span = spanVerifier.endedSpans[0];
        assertCustomAttribute(span, 'span kind', SpanKind.SERVER);
      });
    });

    for (const ignored of ['string', 'function', 'regexp']) {
      it(`should not trace ignored requests with type ${ignored}`, async () => {
        const testPath = `/ignored/${ignored}`;

        const options = {
          host: 'localhost',
          path: testPath,
          port: serverPort,
          headers: {'User-Agent': 'Android'}
        };
        shimmer.unwrap(https, 'get');
        shimmer.unwrap(https, 'request');
        nock.enableNetConnect();

        assert.strictEqual(spanVerifier.endedSpans.length, 0);
        await httpRequest.get(options);
        assert.strictEqual(spanVerifier.endedSpans.length, 0);
      });
    }
  });

  /** Should not intercept incoming and outgoing requests */
  describe('Removing instrumentation', () => {
    it('should not create a root span for incoming requests', async () => {
      plugin.disable();
      const testPath = '/incoming/unpatch/';

      const options = {host: 'localhost', path: testPath, port: serverPort};

      assert.strictEqual(spanVerifier.endedSpans.length, 0);
      await httpRequest.request(options).then((result) => {
        assert.strictEqual(spanVerifier.endedSpans.length, 0);
      });
    });
  });
});
