/**
 * Copyright 2018 OpenCensus Authors.
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

import {CanonicalCode, CoreTracer, MessageEventType, Span, SpanKind, TracerConfig} from '@opencensus/core';
import * as assert from 'assert';
import * as nock from 'nock';

import {MICROS_PER_MILLI, ZipkinExporterOptions, ZipkinTraceExporter} from '../src/zipkin';

/** Zipkin host url */
const zipkinHost = 'http://localhost:9411';
/** Zipkin post path url */
const postPath = '/api/v2/spans';
/**
 * Controls if the tests will use a real network or not
 * true to use a real zipkin service
 * false to use a nock server
 */
const OPENCENSUS_NETWORK_TESTS = process.env.OPENCENSUS_NETWORK_TESTS;

/** Default options for zipkin tests */
const zipkinOptions = {
  url: zipkinHost + postPath,
  serviceName: 'opencensus-tests'
} as ZipkinExporterOptions;

/** Default config for traces tests */
const defaultConfig: TracerConfig = {
  samplingRate: 1
};

/** Run a nock server to replace zipkin service */
const runNockServer = () => {
  nock(zipkinHost)
      .persist()
      .post(postPath)
      .reply(202)
      .post('/wrong')
      .reply(404);
};

/** Checking if tests will use a real network, otherwise run a nock server */
before(() => {
  if (!OPENCENSUS_NETWORK_TESTS) {
    runNockServer();
  }
});

/** Zipkin tests */
describe('Zipkin Exporter', function() {
  /** Desabling the timeout for tests */
  this.timeout(0);

  /** Should called when a rootSpan ended */
  describe('onEndSpan()', () => {
    it('Should add spans to the exporter buffer', () => {
      const exporter = new ZipkinTraceExporter(zipkinOptions);
      const tracer = new CoreTracer();
      tracer.registerSpanEventListener(exporter);
      tracer.start(defaultConfig);

      tracer.startRootSpan({name: 'root-test'}, (rootSpan: Span) => {
        const span =
            rootSpan.startChildSpan({name: 'spanTest', kind: SpanKind.CLIENT});
        span.end();
        rootSpan.end();
        assert.ok(exporter.buffer.getQueue().length > 0);
      });
    });
  });

  /** Should send traces to Zipkin service */
  describe('publish()', () => {
    it('should send traces to Zipkin service', () => {
      const exporter = new ZipkinTraceExporter(zipkinOptions);
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);

      return tracer.startRootSpan(
          {name: 'root-test'}, async (rootSpan: Span) => {
            const span = rootSpan.startChildSpan(
                {name: 'spanTest', kind: SpanKind.CLIENT});
            span.end();
            rootSpan.end();
            return exporter.publish([rootSpan, rootSpan]).then((result) => {
              assert.equal(result.statusCode, 202);
            });
          });
    });
  });

  describe('translateSpan()', () => {
    let rootSpan: Span;
    let span: Span;

    before((done) => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);

      return tracer.startRootSpan({name: 'root-test'}, (_rootSpan: Span) => {
        rootSpan = _rootSpan;
        span =
            rootSpan.startChildSpan({name: 'spanTest', kind: SpanKind.CLIENT});
        span.addAttribute('my-int-attribute', 100);
        span.addAttribute('my-str-attribute', 'value');
        span.addAttribute('my-bool-attribute', true);
        span.setStatus(CanonicalCode.RESOURCE_EXHAUSTED, 'RESOURCE_EXHAUSTED');

        span.addAnnotation('processing', {}, 1550213104708);
        span.addMessageEvent(MessageEventType.SENT, 1, 1550213104708);
        span.addMessageEvent(MessageEventType.RECEIVED, 2, 1550213104708);
        span.addMessageEvent(MessageEventType.UNSPECIFIED, 3, 1550213104708);
        span.addAnnotation('done', {}, 1550213104708);
        span.end();
        rootSpan.end();

        done();
      });
    });

    it('should translate root span to Zipkin format', () => {
      const exporter = new ZipkinTraceExporter(zipkinOptions);
      const rootSpanTranslated = exporter.translateSpan(rootSpan);
      assert.deepEqual(rootSpanTranslated, {
        'annotations': [],
        'debug': true,
        'duration': Math.round(rootSpan.duration * MICROS_PER_MILLI),
        'id': rootSpan.id,
        'kind': 'SERVER',
        'localEndpoint': {'serviceName': 'opencensus-tests'},
        'name': 'root-test',
        'shared': true,
        'tags': {'census.status_code': '0'},
        'timestamp': rootSpan.startTime.getTime() * MICROS_PER_MILLI,
        'traceId': rootSpan.traceId
      });
    });

    it('should translate child span to Zipkin format', () => {
      const exporter = new ZipkinTraceExporter(zipkinOptions);
      const chilsSpanTranslated = exporter.translateSpan(span);
      assert.deepEqual(chilsSpanTranslated, {
        'annotations': [
          {'timestamp': 1550213104708000, 'value': 'processing'},
          {'timestamp': 1550213104708000, 'value': 'done'},
          {'timestamp': 1550213104708000, 'value': 'SENT'},
          {'timestamp': 1550213104708000, 'value': 'RECEIVED'},
          {'timestamp': 1550213104708000, 'value': 'UNSPECIFIED'}
        ],
        'debug': true,
        'duration': Math.round(span.duration * MICROS_PER_MILLI),
        'id': span.id,
        'kind': 'CLIENT',
        'localEndpoint': {'serviceName': 'opencensus-tests'},
        'name': 'spanTest',
        'parentId': rootSpan.id,
        'shared': false,
        'tags': {
          'census.status_code': '8',
          'census.status_description': 'RESOURCE_EXHAUSTED',
          'my-int-attribute': '100',
          'my-str-attribute': 'value',
          'my-bool-attribute': 'true'
        },
        'timestamp': span.startTime.getTime() * MICROS_PER_MILLI,
        'traceId': span.traceId
      });
    });
  });

  describe('publish() with a wrong Zipkin url', () => {
    it('shouldn\'t send traces to Zipkin service and return an 404 error',
       () => {
         /** Creating new options with a wrong url */
         const options = {
           url: zipkinHost + '/wrong',
           serviceName: 'opencensus-tests'
         } as ZipkinExporterOptions;

         const exporter = new ZipkinTraceExporter(options);
         const tracer = new CoreTracer();
         tracer.start(defaultConfig);

         return tracer.startRootSpan(
             {name: 'root-test'}, async (rootSpan: Span) => {
               const span = rootSpan.startChildSpan(
                   {name: 'spanTest', kind: SpanKind.CLIENT});
               span.end();
               rootSpan.end();
               return exporter.publish([rootSpan]).then((result) => {
                 assert.equal(result.statusCode, 404);
               });
             });
       });
  });
});
