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
import * as uuid from 'uuid';
import {randomSpanId} from '../src/internal/util';
import {TracerConfig} from '../src/trace/config/types';
import {RootSpan} from '../src/trace/model/root-span';
import {Span} from '../src/trace/model/span';
import {CoreTracer} from '../src/trace/model/tracer';
import * as types from '../src/trace/model/types';
import {SpanEventListener} from '../src/trace/model/types';

class OnEndSpanClass implements SpanEventListener {
  /** Counter for test use */
  testCount = 0;
  onStartSpan(span: RootSpan): void {}
  /** Happens when a span is ended */
  onEndSpan(span: RootSpan): void {
    this.testCount++;
  }
}

const defaultConfig: TracerConfig = {
  samplingRate: 1.0  // always sampler
};

describe('Tracer', () => {
  const options = {name: 'test'};

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
      tracer.startRootSpan(options, (root) => {
        assert.ok(root);
        assert.ok(tracer.currentRootSpan instanceof RootSpan);
        assert.strictEqual(tracer.currentRootSpan, root);
      });
    });
  });

  /** Should return a started tracer instance */
  describe('start()', () => {
    let tracerStarted: types.Tracer;
    before(() => {
      const tracer = new CoreTracer();
      assert.strictEqual(tracer.active, false);
      tracerStarted = tracer.start(defaultConfig);
    });
    it('should return a tracer instance', () => {
      assert.ok(tracerStarted instanceof CoreTracer);
    });

    it('the trace was started', () => {
      assert.strictEqual(tracerStarted.active, true);
    });
  });

  /** Should return an OnEndSpanEventListener list */
  describe('registerSpanEventListener() / get eventListeners()', () => {
    let tracer: types.Tracer, onEndSpan: OnEndSpanClass;
    before(() => {
      tracer = new CoreTracer();
      onEndSpan = new OnEndSpanClass();
      tracer.registerSpanEventListener(onEndSpan);
    });

    it('should register a new OnEndSpanEventListener on listeners list', () => {
      const listener = tracer.eventListeners[0];
      assert.strictEqual(tracer.eventListeners.length, 1);
      assert.strictEqual(listener, onEndSpan);
    });

    it('should return an OnEndSpanEventListener list', () => {
      for (const listener of tracer.eventListeners) {
        assert.ok(listener instanceof OnEndSpanClass);
      }
    });
  });

  /** Should unregister a OnEndSpanEventlistener */
  describe('unregisterSpanEventListener()', () => {
    let tracer: types.Tracer, onEndSpan: OnEndSpanClass;
    before(() => {
      tracer = new CoreTracer();
      onEndSpan = new OnEndSpanClass();
      tracer.registerSpanEventListener(onEndSpan);
    });

    it('should register a new OnEndSpanEventListener on listeners list', () => {
      const listener = tracer.eventListeners[0];
      assert.strictEqual(tracer.eventListeners.length, 1);
      assert.strictEqual(listener, onEndSpan);
      tracer.unregisterSpanEventListener(onEndSpan);
      assert.strictEqual(tracer.eventListeners.length, 0);
    });
  });

  /** Should stop the trace instance */
  describe('stop()', () => {
    it('should stop the trace instance', () => {
      const tracer = new CoreTracer();
      assert.strictEqual(tracer.active, false);
      tracer.start(defaultConfig);
      assert.strictEqual(tracer.active, true);
      tracer.stop();
      assert.strictEqual(tracer.active, false);
    });
  });


  /** Should create and start a new RootSpan instance */
  describe('startRootSpan()', () => {
    let rootSpanLocal: types.RootSpan;
    before(() => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);
      tracer.startRootSpan(null, (rootSpan) => {
        rootSpanLocal = rootSpan;
      });
    });
    it('should create a new RootSpan instance', () => {
      assert.ok(rootSpanLocal instanceof RootSpan);
    });
    it('should start the rootSpan', () => {
      assert.ok(rootSpanLocal.started);
    });
  });

  /** Should create and start a new RootSpan instance with options */
  describe('startRootSpan() with options', () => {
    let rootSpanLocal: types.RootSpan;
    before(() => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);
      tracer.startRootSpan(options, (rootSpan) => {
        rootSpanLocal = rootSpan;
      });
    });
    it('should create a new RootSpan instance', () => {
      assert.ok(rootSpanLocal instanceof RootSpan);
    });
    it('should start the rootSpan', () => {
      assert.ok(rootSpanLocal.started);
    });
  });

  /** Should not start the new RootSpan instance */
  describe('startRootSpan() with sampler never', () => {
    it('should not start the new RootSpan instance', () => {
      const tracer = new CoreTracer();
      const config = {samplingRate: 0} as TracerConfig;
      tracer.start(config);
      tracer.startRootSpan(options, (rootSpan) => {
        assert.strictEqual(rootSpan, null);
      });
    });
  });

  /** Should not create the new RootSpan instance */
  describe('startRootSpan() before start()', () => {
    it('should not create the new RootSpan instance, tracer not started',
       () => {
         const tracer = new CoreTracer();
         assert.strictEqual(tracer.active, false);
         tracer.startRootSpan(options, (rootSpan) => {
           assert.equal(rootSpan, null);
         });
       });
  });

  describe('startRootSpan() with context propagation', () => {
    const traceOptions = {name: 'rootName', kind: 'spanType'} as
        types.TraceOptions;

    it('should create new RootSpan instance, no propagation', () => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);
      tracer.startRootSpan(traceOptions, (rootSpan) => {
        assert.ok(rootSpan);
        assert.strictEqual(rootSpan.name, traceOptions.name);
        assert.strictEqual(rootSpan.kind, traceOptions.kind);
      });
    });

    const spanContextPropagated = {
      traceId: uuid.v4().split('-').join(''),
      spanId: randomSpanId(),
      options: 0x1
    } as types.SpanContext;


    it('should create the new RootSpan with propagation', () => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);
      traceOptions.spanContext = spanContextPropagated;
      tracer.startRootSpan(traceOptions, (rootSpan) => {
        assert.ok(rootSpan);
        assert.strictEqual(rootSpan.name, traceOptions.name);
        assert.strictEqual(rootSpan.kind, traceOptions.kind);
        assert.strictEqual(rootSpan.traceId, spanContextPropagated.traceId);
        assert.strictEqual(rootSpan.parentSpanId, spanContextPropagated.spanId);
      });
    });

    it('should create the new RootSpan with no propagation', () => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);
      traceOptions.spanContext.options = 0x0;
      tracer.startRootSpan(traceOptions, (rootSpan) => {
        assert.ok(rootSpan);
        assert.strictEqual(rootSpan.name, traceOptions.name);
        assert.strictEqual(rootSpan.kind, traceOptions.kind);
        assert.notEqual(rootSpan.traceId, spanContextPropagated.traceId);
        assert.notEqual(rootSpan.parentSpanId, spanContextPropagated.spanId);
      });
    });
  });


  /** Should set the current root span to null */
  describe('clearCurrentRootSpan()', () => {
    it('should set the current root span to null', () => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);
      tracer.startRootSpan(options, (rootSpan) => {
        tracer.clearCurrentTrace();
        assert.strictEqual(tracer.currentRootSpan, null);
      });
    });
  });


  /** Should create and start a Span instance into a rootSpan */
  describe('startChildSpan()', () => {
    let span: types.Span;
    before(() => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);
      tracer.startRootSpan(options, (rootSpan) => {
        span = tracer.startChildSpan('spanName', 'spanType');
      });
    });
    it('should create a Span instance', () => {
      assert.ok(span instanceof Span);
    });
    it('should start a span', () => {
      assert.ok(span.started);
      assert.strictEqual(span.name, 'spanName');
      assert.strictEqual(span.kind, 'spanType');
    });
  });

  /** Should not create a Span instance */
  describe('startChildSpan() before startRootSpan()', () => {
    it('should not create a Span instance, without a rootspan', () => {
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);
      const span = tracer.startChildSpan('spanName', 'spanType');
      assert.equal(span, null);
    });
  });

  /** Should run eventListeners when the rootSpan ends */
  describe('onEndSpan()', () => {
    it('should run eventListeners when the rootSpan ends', () => {
      const tracer = new CoreTracer();
      const eventListener = new OnEndSpanClass();
      tracer.registerSpanEventListener(eventListener);
      tracer.start(defaultConfig);

      tracer.startRootSpan(options, (rootSpan) => {
        rootSpan.end();
        assert.equal(eventListener.testCount, tracer.eventListeners.length);
      });
    });
  });
});
