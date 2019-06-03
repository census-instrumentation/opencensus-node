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

import * as assert from 'assert';

import { TracerConfig } from '../src/trace/config/types';
import { NoRecordSpan } from '../src/trace/model/no-record/no-record-span';
import { Span } from '../src/trace/model/span';
import { CoreTracer } from '../src/trace/model/tracer';
import * as types from '../src/trace/model/types';

const defaultConfig: TracerConfig = {
  samplingRate: 1.0, // always sampler
};

describe('Tracer', () => {
  const options = { name: 'test' };

  /** Should create a Tracer instance */
  describe('new Tracer()', () => {
    it('should create a Tracer instance', () => {
      const tracer = new CoreTracer();
      assert.ok(tracer instanceof CoreTracer);
    });
  });

  /** Should get/set the current RootSpan from tracer instance */
  describe('get/set currentRootSpan()', () => {
    const tracer = new CoreTracer().start(defaultConfig);
    it('should get the current RootSpan from tracer instance', () => {
      tracer.startRootSpan(options, root => {
        assert.ok(root);
        assert.ok(tracer.currentRootSpan instanceof Span);
        assert.strictEqual(tracer.currentRootSpan, root);
      });
    });
  });

  /** Should create and start a new RootSpan instance with options */
  describe('startRootSpan() with options', () => {
    let rootSpanLocal: types.Span;
    let tracer: types.Tracer;
    before(() => {
      tracer = new CoreTracer();
      tracer.start(defaultConfig);
      tracer.startRootSpan(options, rootSpan => {
        rootSpanLocal = rootSpan;
      });
    });
    it('should create a new RootSpan instance', () => {
      assert.ok(rootSpanLocal instanceof Span);
    });
    it('should set current root span', () => {
      tracer.startRootSpan(options, rootSpan => {
        assert.ok(tracer.currentRootSpan instanceof Span);
        assert.strictEqual(tracer.currentRootSpan, rootSpan);
      });
    });
  });

  /** Should set the current root span to null */
  describe('clearCurrentRootSpan()', () => {
    it('should set the current root span to null', () => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);
      tracer.startRootSpan(options, rootSpan => {
        assert.ok(tracer.currentRootSpan instanceof Span);
        assert.strictEqual(tracer.currentRootSpan, rootSpan);
        tracer.clearCurrentTrace();
        assert.strictEqual(tracer.currentRootSpan, null);
      });
    });
  });

  /** Should create and start a Span instance into a rootSpan */
  describe('startChildSpan()', () => {
    let span: types.Span;
    let rootSpanLocal: types.Span;
    let tracer: types.TracerBase;
    before(() => {
      tracer = new CoreTracer();
      tracer.start(defaultConfig);
      tracer.startRootSpan(options, rootSpan => {
        rootSpanLocal = rootSpan;
        span = tracer.startChildSpan({
          name: 'spanName',
          kind: types.SpanKind.CLIENT,
        });
      });
    });
    it('should create a Span instance', () => {
      assert.ok(span instanceof Span);
    });
    it('should set child of to root span automatically', () => {
      assert.strictEqual(rootSpanLocal.numberOfChildren, 1);
      assert.ok(span.id);
      // instance equal is not possible due circular dependencies
      assert.strictEqual(rootSpanLocal.spans[0].id, span.id);
    });
  });

  /** Should not create a Span instance */
  describe('startChildSpan() before startRootSpan()', () => {
    it('should create a NoRecordSpan instance, without a rootspan', () => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);
      const span = tracer.startChildSpan({
        name: 'spanName',
        kind: types.SpanKind.UNSPECIFIED,
      });
      assert.ok(span instanceof NoRecordSpan);
    });
  });
});
