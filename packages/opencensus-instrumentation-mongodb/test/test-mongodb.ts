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

import {CoreTracer, Span, SpanEventListener, SpanKind} from '@opencensus/core';
import * as assert from 'assert';
import * as mongodb from 'mongodb';
import {plugin} from '../src/';

export type MongoDBAccess = {
  client: mongodb.MongoClient,
  collection: mongodb.Collection
};

/** Collects ended root spans to allow for later analysis. */
class RootSpanVerifier implements SpanEventListener {
  endedRootSpans: Span[] = [];

  onStartSpan(span: Span): void {}
  onEndSpan(root: Span) {
    this.endedRootSpans.push(root);
  }
}

/**
 * Access the mongodb collection.
 * @param url The mongodb URL to access.
 * @param dbName The mongodb database name.
 * @param collectionName The mongodb collection name.
 */
function accessCollection(url: string, dbName: string, collectionName: string):
    Promise<MongoDBAccess> {
  return new Promise((resolve, reject) => {
    mongodb.MongoClient.connect(url, function connectedClient(err, client) {
      if (err) {
        reject(err);
        return;
      }
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
      resolve({'client': client, 'collection': collection});
    });
  });
}

/**
 * Asserts root spans attributes.
 * @param rootSpanVerifier An instance of rootSpanVerifier to analyse RootSpan
 * instances from.
 * @param expectedName The expected name of the first root span.
 * @param expectedKind The expected kind of the first root span.
 */
function assertSpan(
    rootSpanVerifier: RootSpanVerifier, expectedName: string,
    expectedKind: SpanKind) {
  assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
  assert.strictEqual(rootSpanVerifier.endedRootSpans[0].spans.length, 1);
  // we are forced to ignore the error because 'truncated' is a private
  // field but needed to verify that the span are correctly ended.
  // @ts-ignore
  const isTruncated = rootSpanVerifier.endedRootSpans[0].spans[0].truncated;
  assert.strictEqual(
      isTruncated, false, 'the span should not have been truncated');
  assert.strictEqual(
      rootSpanVerifier.endedRootSpans[0].spans[0].name, expectedName);
  assert.strictEqual(
      rootSpanVerifier.endedRootSpans[0].spans[0].kind, expectedKind);
}

describe('MongoDBPlugin', () => {
  // For these tests, mongo must be runing. Add OPENCENSUS_MONGODB_TESTS to run
  // these tests.
  const OPENCENSUS_MONGODB_TESTS =
      process.env.OPENCENSUS_MONGODB_TESTS as string;
  let shouldTest = true;
  if (!OPENCENSUS_MONGODB_TESTS) {
    console.log('Skipping test-mongodb. Run MongoDB to test');
    shouldTest = false;
  }

  const URL = 'mongodb://localhost:27017';
  const DB_NAME = 'opencensus-tests';
  const COLLECTION_NAME = 'test';
  const VERSION = process.versions.node;

  const tracer = new CoreTracer();
  const rootSpanVerifier = new RootSpanVerifier();
  let client: mongodb.MongoClient;
  let collection: mongodb.Collection;

  before((done) => {
    tracer.start({samplingRate: 1});
    tracer.registerSpanEventListener(rootSpanVerifier);
    plugin.enable(mongodb, tracer, VERSION, {}, '');
    accessCollection(URL, DB_NAME, COLLECTION_NAME)
        .then(result => {
          client = result.client;
          collection = result.collection;
          done();
        })
        .catch((err: Error) => {
          console.log(
              'Skipping test-mongodb. Could not connect. Run MongoDB to test');
          shouldTest = false;
          done();
        });
  });

  beforeEach(function mongoBeforeEach(done) {
    // Skiping all tests in beforeEach() is a workarround. Mocha does not work
    // properly when skiping tests in before() on nested describe() calls.
    // https://github.com/mochajs/mocha/issues/2819
    if (!shouldTest) {
      this.skip();
    }
    rootSpanVerifier.endedRootSpans = [];
    // Non traced insertion of basic data to perform tests
    const insertData = [{a: 1}, {a: 2}, {a: 3}];
    collection.insertMany(insertData, (err, result) => {
      done();
    });
  });

  afterEach((done) => {
    collection.remove({}, done);
  });

  after(() => {
    if (client) {
      client.close();
    }
  });

  /** Should intercept query */
  describe('Instrumenting query operations', () => {
    it('should create a child span for insert', (done) => {
      const insertData = [{a: 1}, {a: 2}, {a: 3}];

      tracer.startWithRootSpan({name: 'insertRootSpan'}, (rootSpan: Span) => {
        collection.insertMany(insertData, (err, result) => {
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.ifError(err);
          assertSpan(
              rootSpanVerifier, `${DB_NAME}.${COLLECTION_NAME}.query`,
              SpanKind.SERVER);
          done();
        });
      });
    });

    it('should create a child span for update', (done) => {
      tracer.startWithRootSpan({name: 'updateRootSpan'}, (rootSpan: Span) => {
        collection.updateOne({a: 2}, {$set: {b: 1}}, (err, result) => {
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.ifError(err);
          assertSpan(
              rootSpanVerifier, `${DB_NAME}.${COLLECTION_NAME}.query`,
              SpanKind.SERVER);
          done();
        });
      });
    });

    it('should create a child span for remove', (done) => {
      tracer.startWithRootSpan({name: 'removeRootSpan'}, (rootSpan: Span) => {
        collection.deleteOne({a: 3}, (err, result) => {
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.ifError(err);
          assertSpan(
              rootSpanVerifier, `${DB_NAME}.${COLLECTION_NAME}.query`,
              SpanKind.SERVER);
          done();
        });
      });
    });
  });

  /** Should intercept cursor */
  describe('Instrumenting cursor operations', () => {
    it('should create a child span for find', (done) => {
      tracer.startWithRootSpan({name: 'findRootSpan'}, (rootSpan: Span) => {
        collection.find({}).toArray((err, result) => {
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.ifError(err);
          assertSpan(
              rootSpanVerifier, `${DB_NAME}.${COLLECTION_NAME}.cursor`,
              SpanKind.SERVER);
          done();
        });
      });
    });
  });

  /** Should intercept command */
  describe('Instrumenting command operations', () => {
    it('should create a child span for create index', (done) => {
      tracer.startWithRootSpan({name: 'indexRootSpan'}, (rootSpan: Span) => {
        collection.createIndex({a: 1}, (err, result) => {
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.ifError(err);
          assertSpan(
              rootSpanVerifier, `${DB_NAME}.$cmd.createIndexes`,
              SpanKind.SERVER);
          done();
        });
      });
    });

    it('should create a child span for count', (done) => {
      tracer.startWithRootSpan({name: 'countRootSpan'}, (rootSpan: Span) => {
        collection.count({a: 1}, (err, result) => {
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.ifError(err);
          assertSpan(
              rootSpanVerifier, `${DB_NAME}.$cmd.count`, SpanKind.SERVER);
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

    it('should not create a child span for query', (done) => {
      const insertData = [{a: 1}, {a: 2}, {a: 3}];

      tracer.startWithRootSpan({name: 'insertRootSpan'}, (rootSpan: Span) => {
        collection.insertMany(insertData, (err, result) => {
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.ifError(err);
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
          assert.strictEqual(
              rootSpanVerifier.endedRootSpans[0].spans.length, 0);
          done();
        });
      });
    });

    it('should not create a child span for cursor', (done) => {
      tracer.startWithRootSpan({name: 'findRootSpan'}, (rootSpan: Span) => {
        collection.find({}).toArray((err, result) => {
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.ifError(err);
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
          assert.strictEqual(
              rootSpanVerifier.endedRootSpans[0].spans.length, 0);
          done();
        });
      });
    });

    it('should not create a child span for command', (done) => {
      tracer.startWithRootSpan({name: 'indexRootSpan'}, (rootSpan: Span) => {
        collection.createIndex({a: 1}, (err, result) => {
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
          rootSpan.end();
          assert.ifError(err);
          assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 1);
          assert.strictEqual(
              rootSpanVerifier.endedRootSpans[0].spans.length, 0);
          done();
        });
      });
    });
  });
});
