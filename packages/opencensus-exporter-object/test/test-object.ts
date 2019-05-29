/**
 * Copyright 2019 OpenCensus Authors.
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

import {CoreTracer, Span, SpanKind, TracerConfig} from '@opencensus/core';
import * as assert from 'assert';

import {ObjectTraceExporter} from '../src/object';

/** Default config for traces tests */
const defaultConfig: TracerConfig = {
  samplingRate: 1
};

/** Object Exporter tests */
describe('Object Exporter', () => {
  /** Should called when a span started */
  describe('onStartSpan()', () => {
    it('Should add spans to the started spans', () => {
      const exporter = new ObjectTraceExporter({});
      const tracer = new CoreTracer();
      tracer.registerSpanEventListener(exporter);
      tracer.start(defaultConfig);

      tracer.startRootSpan({name: 'root-test'}, (rootSpan: Span) => {
        assert.strictEqual(exporter.startedSpans.length, 1);
        rootSpan.startChildSpan({name: 'spanTest', kind: SpanKind.CLIENT});
        assert.strictEqual(exporter.startedSpans.length, 2);
      });
    });
  });

  /** Should called when a span ended */
  describe('onEndSpan()', () => {
    it('Should add spans to the ended spans and to buffer', () => {
      const exporter = new ObjectTraceExporter({});
      const tracer = new CoreTracer();
      tracer.registerSpanEventListener(exporter);
      tracer.start(defaultConfig);

      tracer.startRootSpan({name: 'root-test'}, (rootSpan: Span) => {
        const span =
            rootSpan.startChildSpan({name: 'spanTest', kind: SpanKind.CLIENT});
        span.end();
        assert.strictEqual(exporter.endedSpans.length, 1);
        rootSpan.end();
        assert.strictEqual(exporter.endedSpans.length, 2);
        assert.ok(exporter.buffer.getQueue().length > 0);
      });
    });
  });

  /** Should add traces to the published store */
  describe('publish()', () => {
    it('should add spans to the published store', () => {
      const exporter = new ObjectTraceExporter({});
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);

      return tracer.startRootSpan(
          {name: 'root-test'}, async (rootSpan: Span) => {
            const span = rootSpan.startChildSpan(
                {name: 'spanTest', kind: SpanKind.CLIENT});
            span.end();
            rootSpan.end();
            await exporter.publish([rootSpan, rootSpan]);
            assert.strictEqual(exporter.publishedSpans.length, 2);
          });
    });
  });

  /** Should empty memory stores */
  describe('reset()', () => {
    it('Should add spans to the ended spans and to buffer', () => {
      const exporter = new ObjectTraceExporter({});
      const tracer = new CoreTracer();
      tracer.registerSpanEventListener(exporter);
      tracer.start(defaultConfig);

      tracer.startRootSpan({name: 'root-test'}, (rootSpan: Span) => {
        const span =
            rootSpan.startChildSpan({name: 'spanTest', kind: SpanKind.CLIENT});
        span.end();
        rootSpan.end();
        exporter.publish([rootSpan, rootSpan]);

        exporter.reset();
        assert.deepStrictEqual(exporter.startedSpans, []);
        assert.deepStrictEqual(exporter.endedSpans, []);
        assert.deepStrictEqual(exporter.publishedSpans, []);
      });
    });
  });
});
