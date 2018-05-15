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
import * as http from 'http';
import * as mocha from 'mocha';
import * as nock from 'nock';
import * as shimmer from 'shimmer';

import {plugin} from '../src/';
import {HttpPlugin} from '../src/';


function doNoke(
    url: string, path: string, httpCode: number, respBody: string,
    times?: number) {
  let i = times;
  if (!times) {
    i = 1;
  }
  nock(url).get(path).times(i).reply(httpCode, respBody);
}


const httpRequest = {
  get: (options: {}|string) => {
    return (new Promise((resolve, reject) => {
      return http.get(options, resp => {
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
    }));
  }
};

const VERSION = process.versions.node;

class RootSpanVerifier implements types.OnEndSpanEventListener {
  endedRootSpans: types.RootSpan[] = [];

  onEndSpan(root: types.RootSpan) {
    this.endedRootSpans.push(root);
  }
}

const server = http.createServer((request, response) => {
                     response.end('Test Server Response');
                   })
                   .listen(3000);


// mocha this.timeout() fails when using ES6's arrow functions
// (Issue link: https://github.com/mochajs/mocha/issues/2018)
// tslint:disable-next-line
describe('HttpPlugin', function() {
  const urlHost = 'http://fake.service.io';

  const log = logger.logger();
  const tracer = new classes.Tracer();
  const rootSpanVerifier = new RootSpanVerifier();
  tracer.start({samplingRate: 1, logger: log});

  it('should return a plugin', () => {
    assert.ok(plugin instanceof HttpPlugin);
  });

  before(() => {
    plugin.applyPatch(http, tracer, VERSION);
    tracer.registerEndSpanListener(rootSpanVerifier);
  });

  beforeEach(() => {
    rootSpanVerifier.endedRootSpans = [];
    nock.cleanAll();
  });

  after(() => {
    server.close();
  });

  /** Should intercept outgoing requests */
  describe('patchOutgoingRequest()', () => {
    it('should create a rootSpan for GET requests as a client', async () => {
      const testPath = '/outgoing/rootSpan/1';
      doNoke(urlHost, testPath, 200, 'Ok');
      assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
      await httpRequest.get(`${urlHost}${testPath}`).then((result) => {
        assert.strictEqual(result, 'Ok');
        assert.ok(
            rootSpanVerifier.endedRootSpans[0].name.indexOf(testPath) >= 0);
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
      });
    });

    // TODO: testing failing for node 6
    it('should create a child span for GET requests', () => {
      const testPath = '/outgoing/rootSpan/childs/1';
      doNoke(urlHost, testPath, 200, 'Ok');
      const options = {name: 'TestRootSpan'};
      return tracer.startRootSpan(options, async root => {
        await httpRequest.get(`${urlHost}${testPath}`).then((result) => {
          assert.ok(root.name.indexOf('TestRootSpan') >= 0);
          assert.strictEqual(root.spans.length, 1);
          assert.ok(root.spans[0].name.indexOf(testPath) >= 0);
          assert.strictEqual(root.traceId, root.spans[0].traceId);
        });
      });
    });

    // TODO: testing failing for node 6
    it('should create multiple child spans for GET requests', () => {
      const testPath = '/outgoing/rootSpan/childs';
      const num = 5;
      doNoke(urlHost, testPath, 200, 'Ok', num);
      const options = {name: 'TestRootSpan'};
      return tracer.startRootSpan(options, async root => {
        assert.ok(root.name.indexOf('TestRootSpan') >= 0);
        for (let i = 0; i < num; i++) {
          await httpRequest.get(`${urlHost}${testPath}`).then((result) => {
            assert.strictEqual(root.spans.length, i + 1);
            assert.ok(root.spans[i].name.indexOf(testPath) >= 0);
            assert.strictEqual(root.traceId, root.spans[i].traceId);
          });
        }
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
        root.end();
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
      });
    });

    it('should not trace exporters requests', async () => {
      const testPath = '/outgoing/do-not-trace';
      doNoke(urlHost, testPath, 200, 'Ok');

      const options = {
        host: 'fake.service.io',
        path: testPath,
        headers: {'x-opencensus-outgoing-request': 1}
      };

      assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
      await httpRequest.get(options).then((result) => {
        assert.equal(result, 'Ok');
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
      });
    });
  });  // describe pathcOutgoing


  /** Should intercept incoming requests */
  describe('patchIncomingRequest()', () => {
    it('should create a root span for incoming requests', async () => {
      const testPath = '/incoming/rootSpan/';

      const options = {host: 'localhost', path: testPath, port: 3000};
      shimmer.unwrap(http, 'get');
      shimmer.unwrap(http, 'request');

      assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
      await httpRequest.get(options).then((result) => {
        assert.ok(
            rootSpanVerifier.endedRootSpans[0].name.indexOf(testPath) >= 0);
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
      });
    });
  });

  /** Should not intercept incoming and outgoing requests */
  describe('applyUnpatch()', () => {
    it('should not create a root span for incoming requests', async () => {
      plugin.applyUnpatch();
      const testPath = '/incoming/unpatch/';

      const options = {host: 'localhost', path: testPath, port: 3000};

      assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
      await httpRequest.get(options).then((result) => {
        assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
      });
    });
  });
});
