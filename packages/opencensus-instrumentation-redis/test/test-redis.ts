/**
 * Copyright 2019, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
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

import {CoreTracer, logger, RootSpan, Span, SpanEventListener, SpanKind} from '@opencensus/core';
import * as assert from 'assert';
import * as redis from 'redis';

import {plugin} from '../src';

/** Collects ended root spans to allow for later analysis. */
class RootSpanVerifier implements SpanEventListener {
  endedRootSpans: RootSpan[] = [];

  onStartSpan(span: RootSpan): void {
    return;
  }
  onEndSpan(root: RootSpan) {
    this.endedRootSpans.push(root);
  }
}

/**
 * Asserts root spans attributes.
 * @param rootSpanVerifier An instance of rootSpanVerifier to analyse RootSpan
 *    instances from.
 * @param expectedName The expected name of the first root span.
 * @param expectedKind The expected kind of the first root span.
 */
function assertSpan(
    rootSpanVerifier: RootSpanVerifier, expectedName: string,
    expectedKind: SpanKind, verifyAttribute?: (span: Span) => boolean) {
  assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
  assert.strictEqual(rootSpanVerifier.endedRootSpans[0].spans.length, 1);
  assert.strictEqual(
      rootSpanVerifier.endedRootSpans[0].spans[0].name, expectedName);
  assert.strictEqual(
      rootSpanVerifier.endedRootSpans[0].spans[0].kind, expectedKind);
  if (typeof verifyAttribute === 'function') {
    for (const span of rootSpanVerifier.endedRootSpans[0].spans) {
      assert(verifyAttribute(span), 'failed to verify attribute');
    }
  }
}

/**
 * Access the redis client.
 * @param url The redis URL to access.
 */
function accessCollection(url: string): Promise<redis.RedisClient> {
  return new Promise((resolve, reject) => {
    const client = redis.createClient({url});
    client.on('error', (err) => {
      reject(err);
      return;
    });
    resolve(client);
  });
}

describe('RedisPlugin', () => {
  // For these tests, mongo must be runing. Add OPENCENSUS_REDIS_TESTS to run
  // these tests.
  const OPENCENSUS_REDIS_TESTS = process.env.OPENCENSUS_REDIS_TESTS;
  const OPENCENSUS_REDIS_HOST = process.env.OPENCENSUS_REDIS_HOST;
  let shouldTest = true;
  if (!OPENCENSUS_REDIS_TESTS) {
    console.log('Skipping test-redis. Run REDIS to test');
    shouldTest = false;
  }

  const URL = `redis://${OPENCENSUS_REDIS_HOST || 'localhost'}:6379`;
  const VERSION = '2.8.0';
  const REDIS_QUERY_TYPE = SpanKind.CLIENT;

  const tracer = new CoreTracer();
  const rootSpanVerifier = new RootSpanVerifier();
  let client: redis.RedisClient;

  before((done) => {
    tracer.start({samplingRate: 1, logger: logger.logger(1)});
    tracer.registerSpanEventListener(rootSpanVerifier);
    plugin.enable(redis, tracer, VERSION, {}, '');
    accessCollection(URL)
        .then(result => {
          client = result;
          done();
        })
        .catch((err: Error) => {
          console.log(
              'Skipping test-redis. Could not connect. Run Redis to test');
          shouldTest = false;
          done();
        });
  });

  beforeEach(function redisBeforeEach(done) {
    // Skiping all tests in beforeEach() is a workarround. Mocha does not work
    // properly when skiping tests in before() on nested describe() calls.
    // https://github.com/mochajs/mocha/issues/2819
    if (!shouldTest) {
      this.skip();
    }
    rootSpanVerifier.endedRootSpans = [];
    // Non traced insertion of basic data to perform tests
    client.set('test', 'data', done);
  });

  afterEach((done) => {
    client.del('hash', done);
  });

  after(() => {
    if (client) {
      client.quit();
    }
  });

  /** Should intercept query */
  describe('Instrumenting query operations', () => {
    it('should create a child span for hset', (done) => {
      tracer.startRootSpan({name: 'insertRootSpan'}, (rootSpan: RootSpan) => {
        client.hset('hash', 'random', 'random', (err, result) => {
          assert.ifError(err);
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assertSpan(
              rootSpanVerifier, `redis-hset`, REDIS_QUERY_TYPE, (span) => {
                return span.attributes.arguments === undefined;
              });
          done();
        });
      });
    });

    it('should create a child span for get', (done) => {
      tracer.startRootSpan({name: 'getRootSpan'}, (rootSpan: RootSpan) => {
        client.get('test', (err, result) => {
          assert.ifError(err);
          assert.strictEqual(result, 'data');
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assertSpan(
              rootSpanVerifier, `redis-get`, REDIS_QUERY_TYPE, (span) => {
                return span.attributes.arguments === undefined;
              });
          done();
        });
      });
    });

    it('should create a child span for del', (done) => {
      tracer.startRootSpan({name: 'removeRootSpan'}, (rootSpan: RootSpan) => {
        client.del('test', (err, result) => {
          assert.ifError(err);
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assertSpan(
              rootSpanVerifier, `redis-del`, REDIS_QUERY_TYPE, (span) => {
                return span.attributes.arguments === undefined;
              });
          done();
        });
      });
    });
  });

  /** Should intercept command */
  describe('Removing Instrumentation', () => {
    before(() => {
      plugin.applyUnpatch();
    });

    it('should not create a child span for insert', (done) => {
      tracer.startRootSpan({name: 'insertRootSpan'}, (rootSpan: RootSpan) => {
        client.hset('hash', 'random', 'random', (err, result) => {
          assert.ifError(err);
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
          assert.strictEqual(
              rootSpanVerifier.endedRootSpans[0].spans.length, 0);
          done();
        });
      });
    });

    it('should not create a child span for get', (done) => {
      tracer.startRootSpan({name: 'getRootSpan'}, (rootSpan: RootSpan) => {
        client.get('test', (err, result) => {
          assert.ifError(err);
          assert.strictEqual(result, 'data');
          rootSpan.end();
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
          assert.strictEqual(
              rootSpanVerifier.endedRootSpans[0].spans.length, 0);
          done();
        });
      });
    });

    it('should not create a child span for del', (done) => {
      tracer.startRootSpan({name: 'removeRootSpan'}, (rootSpan: RootSpan) => {
        client.del('test', (err, result) => {
          assert.ifError(err);
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
          assert.strictEqual(
              rootSpanVerifier.endedRootSpans[0].spans.length, 0);
          done();
        });
      });
    });
  });
});
