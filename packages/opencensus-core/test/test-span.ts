/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import * as assert from 'assert';
import * as mocha from 'mocha';

import {RootSpanImpl} from '../src/trace/model/rootspan';
import {SpanImpl} from '../src/trace/model/span';
import {TracerImpl} from '../src/trace/model/tracer';
import {Span} from '../src/trace/model/types';

let tracer = new TracerImpl();

describe('Span', function() {
  /**
   * Should create a span
   */
  describe('new Span()', function() {
    it('should create a Span instance', function() {
      const rootSpan = new RootSpanImpl(tracer);
      const span = new SpanImpl(rootSpan);
      assert.ok(span instanceof SpanImpl);
    });
  });

  /**
   * Should return the Trace ID
   */
  describe('get traceId()', function() {
    it('should return the trace id', function() {
      const rootSpan = new RootSpanImpl(tracer);
      rootSpan.start();
      const span = new SpanImpl(rootSpan);
      assert.equal(span.traceId, rootSpan.traceId);
    });
  });

  /**
   * Should the trace context of span
   */
  describe('get traceContext()', function() {
    it('should the trace context of span', function() {
      const rootSpan = new RootSpanImpl(tracer);
      rootSpan.start();
      
      const span = new SpanImpl(rootSpan);
      const context = span.traceContext;

      assert.equal(context.traceId, rootSpan.traceId);
      assert.equal(context.spanId, span.id);
      assert.equal(context.options, 1);
    });
  });

  /**
   * Should start a span instance
   */
  describe('start()', function() {
    it('should start a span instance', function() {
      const rootSpan = new RootSpanImpl(tracer);
      rootSpan.start();
      
      const span = new SpanImpl(rootSpan);
      span.start();

      assert.ok(span.started);
    });
  });

  /**
   * Should end a span instance
   */
  describe('end()', function() {
    it('should end a span instance', function() {
      const rootSpan = new RootSpanImpl(tracer);
      rootSpan.start();
      
      const span = new SpanImpl(rootSpan);
      span.start();
      span.end();

      assert.ok(span.ended);
    });
  });

  /**
   * Should not end a span instance
   */
  describe('end() before start the span', function() {
    it('should not end a span instance', function() {
      const rootSpan = new RootSpanImpl(tracer);
      rootSpan.start();
      
      const span = new SpanImpl(rootSpan);
      span.end();

      assert.ok(!span.ended);
    });
  });
});