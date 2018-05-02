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

import {Span} from '../../opencensus-core/build/src/index-classes';
import {B3Format} from '../src/b3Format';

const X_B3_TRACE_ID = 'x-b3-traceid';
const X_B3_SPAN_ID = 'x-b3-spanid';
const X_B3_PARENT_SPAN_ID = 'x-x3-parentspanid';
const X_B3_SAMPLED = 'x-b3-sampled';

const SAMPLED_VALUE = '1';
const NOT_SAMPLED_VALUE = '0';

// tslint:disable:no-any
function assertHeader(headers: any, span: types.Span) {
  if (span) {
    assert.ok(
        headers[X_B3_TRACE_ID] && headers[X_B3_TRACE_ID] === span.traceId);
    assert.ok(headers[X_B3_SPAN_ID] && headers[X_B3_SPAN_ID] === span.id);
    assert.ok(headers[X_B3_SAMPLED] && headers[X_B3_SAMPLED] === SAMPLED_VALUE);
  } else {
    assert.ok(headers[X_B3_TRACE_ID] && headers[X_B3_TRACE_ID] === 'undefined');
    assert.ok(headers[X_B3_SPAN_ID] && headers[X_B3_SPAN_ID] === 'undefined');
    assert.ok(
        headers[X_B3_SAMPLED] && headers[X_B3_SAMPLED] === NOT_SAMPLED_VALUE);
  }
}

// tslint:disable:no-any
function assertContext(headers: any, context: types.SpanContext) {
  if (headers[X_B3_SAMPLED] && headers[X_B3_SAMPLED] === SAMPLED_VALUE) {
    assert.ok(
        headers[X_B3_TRACE_ID] && headers[X_B3_TRACE_ID] === context.traceId);
    assert.ok(
        headers[X_B3_SPAN_ID] && headers[X_B3_SPAN_ID] === context.spanId);
    assert.strictEqual(context.options, 1);
  } else {
    assert.strictEqual(context.options, 0);
  }
}

describe('B3Propagation', () => {
  /** Should inject spans to header */
  describe('injectToHeader()', () => {
    it('should inject a sapmled span context to a header', () => {
      const tracer = new classes.Tracer();
      tracer.start({
        samplingRate: 1,
      });

      tracer.startRootSpan({name: 'testRootSpan'}, span => {
        const headers = B3Format.injectToHeader({}, span);
        assertHeader(headers, span);
        span.end();
      });
    });

    it('should inject a not sapmled span context to a header', () => {
      const tracer = new classes.Tracer();
      tracer.start({
        samplingRate: 0,
      });

      tracer.startRootSpan({name: 'testRootSpan'}, span => {
        const headers = B3Format.injectToHeader({}, span);
        assertHeader(headers, span);
      });
    });
  });

  /** Should get the singleton trancing instance. */
  describe('extractFromHeader()', () => {
    it('should extract context of a sampled span from headers', () => {
      // tslint:disable:no-any
      const headers = {} as any;
      headers[X_B3_TRACE_ID] = 'testTraceId';
      headers[X_B3_SPAN_ID] = 'testSpanId';
      headers[X_B3_PARENT_SPAN_ID] = 'testParentSpanId';
      headers[X_B3_SAMPLED] = SAMPLED_VALUE;

      const context = B3Format.extractFromHeader(headers);
      assertContext(headers, context);
    });

    it('should extract context of a sampled span from headers', () => {
      // tslint:disable:no-any
      const headers = {} as any;
      headers[X_B3_SAMPLED] = NOT_SAMPLED_VALUE;

      const context = B3Format.extractFromHeader(headers);
      assertContext(headers, context);
    });
  });
});