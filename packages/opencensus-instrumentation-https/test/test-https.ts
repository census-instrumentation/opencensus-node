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
import * as fs from 'fs';
import * as https from 'https';
import * as mocha from 'mocha';
import * as shimmer from 'shimmer';

const log = logger.logger('debug');

import {plugin} from '../src/https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function makeRequest(href: string|object, span?: types.Span) {
  await https.get(href, resp => {
    resp.on('data', chunk => {});
    resp.on('end', () => {
      if (span) span.end();
    });
  });
}

// mocha this.timeout() fails when using ES6's arrow functions
// (Issue link: https://github.com/mochajs/mocha/issues/2018)
// tslint:disable-next-line
describe('HttpsPlugin', function() {
  const testHost = 'https://localhost:3000/';

  class RootSpanVerifier implements types.OnEndSpanEventListener {
    endedRootSpans: types.RootSpan[] = [];

    onEndSpan(root: types.RootSpan) {
      this.endedRootSpans.push(root);
    }
  }

  const tracer = new classes.Tracer();
  tracer.start({
    samplingRate: 1,
  });

  plugin.applyPatch(https, tracer, '8.9.1');

  const rootSpanVerifier = new RootSpanVerifier();
  tracer.registerEndSpanListener(rootSpanVerifier);

  const httpsOptions = {
    key: fs.readFileSync('./encryption/key.pem'),
    cert: fs.readFileSync('./encryption/cert.pem')
  };

  const server = https
                     .createServer(
                         httpsOptions,
                         (request, response) => {
                           response.end('Test Server Response');
                         })
                     .listen(3000);

  /** Should intercept outgoing requests */
  describe('patchOutgoingRequest()', () => {
    this.timeout(0);
    shimmer.unwrap(https && https.Server && https.Server.prototype, 'emit');

    it('should create a rootSpan for GET requests', async () => {
      const testPath = 'testOutgoing/rootSpan/';
      makeRequest(testHost + testPath);

      setTimeout(() => {
        assert.ok(rootSpanVerifier.endedRootSpans.some(root => {
          return root.name.indexOf(testPath) >= 0;
        }));
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
      }, 400);
    });

    it('should create a child span for GET requests', async () => {
      rootSpanVerifier.endedRootSpans = [];
      const options = {name: 'TestRootSpan'};
      const testPath = 'testOutgoing/childSpan/';

      tracer.startRootSpan(options, async root => {
        makeRequest(testHost + testPath, root);
      });

      setTimeout(() => {
        assert.ok(rootSpanVerifier.endedRootSpans.some(root => {
          return root.name.indexOf('TestRootSpan') >= 0 &&
              root.spans.some(span => {
                return span.name.indexOf(testPath) >= 0;
              });
        }));
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
      }, 400);
    });

    it('should create multiple child spans for GET requests', async () => {
      rootSpanVerifier.endedRootSpans = [];
      const testPath = 'testOutgoing/multipleChildSpans/';

      const options = {name: 'TestRootSpan'};
      tracer.startRootSpan(options, async root => {
        let i = 0;
        while (i < 10) {
          makeRequest(testHost + testPath, root);
          i += 1;
        }
      });

      setTimeout(() => {
        assert.ok(rootSpanVerifier.endedRootSpans.some(root => {
          return root.name.indexOf('TestRootSpan') >= 0 &&
              root.spans.length === 10 && root.spans.some(span => {
                return span.name.indexOf(testPath) >= 0;
              });
        }));
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
      }, 300);
    });

    it('should not trace exporters requests', async () => {
      rootSpanVerifier.endedRootSpans = [];

      const options = {
        host: 'localhost',
        port: 3000,
        headers: {'x-opencensus-outgoing-request': 1}
      };
      makeRequest(options);

      setTimeout(() => {
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
      }, 400);
    });
  });

  /** Should intercept incoming requests */
  describe('patchIncomingRequest()', () => {
    this.timeout(0);
    plugin.applyPatch(https, tracer, '8.9.1');
    shimmer.unwrap(https, 'request');

    it('should create a root span for incoming requests', async () => {
      rootSpanVerifier.endedRootSpans = [];
      const testPath = 'testIncoming/rootSpan/';
      makeRequest(testHost + testPath);

      setTimeout(() => {
        assert.ok(rootSpanVerifier.endedRootSpans.some(root => {
          return root.name.indexOf(testPath) >= 0;
        }));
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
      }, 400);
    });
  });

  /** Should not intercept incoming and outgoing requests */
  describe('applyUnpatch()', () => {
    this.timeout(0);

    it('should not create a root span for incoming requests', async () => {
      plugin.applyUnpatch();
      rootSpanVerifier.endedRootSpans = [];
      const testPath = 'testIncoming/doNotTrace/';
      makeRequest(testHost + testPath);

      setTimeout(() => {
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
        server.close();
      }, 500);
    });
  });
});