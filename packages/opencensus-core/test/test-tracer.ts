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
import {EventEmitter} from 'events';

import {TracerConfig} from '../src/trace/config/types';
import {RootSpan} from '../src/trace/model/root-span';
import {Span} from '../src/trace/model/span';
import {Tracer} from '../src/trace/model/tracer';
import {OnEndSpanEventListener} from '../src/trace/model/types';

class OnEndSpanClass implements OnEndSpanEventListener {
  /** Counter for test use */
  testCount = 0;
  /** Happens when a span is ended */
  onEndSpan(span: RootSpan): void {
    this.testCount++;
  }
}

const defaultConfig: TracerConfig = {
  samplingRate: 1
};

describe('Tracer', () => {
  const options = {name: 'test'};

  /** Should create a Tracer instance */
  describe('new Tracer()', () => {
    it('should create a Tracer instance', () => {
      const tracer = new Tracer();
      assert.ok(tracer instanceof Tracer);
    });
  });

  /** Should get/set the current RootSpan from tracer instance */
  describe('get/set currentRootSpan()', () => {
    let tracer, rootSpan;
    before(() => {
      tracer = new Tracer();
      rootSpan = new RootSpan(tracer);
      tracer.currentRootSpan = rootSpan;
    });
    it('should get the current RootSpan from tracer instance', () => {
      assert.ok(tracer.currentRootSpan instanceof RootSpan);
    });
    it('should set the current RootSpan from tracer instance', () => {
      assert.equal(tracer.currentRootSpan, rootSpan);
    });
  });

  /** Should return a started tracer instance */
  describe('start()', () => {
    let tracerStarted;
    before(() => {
      const tracer = new Tracer();
      tracerStarted = tracer.start(defaultConfig);
    });
    it('should return a tracer instance', () => {
      assert.ok(tracerStarted instanceof Tracer);
    });

    it('the trace was started', () => {
      assert.ok(tracerStarted.active);
    });
  });

  /** Should return an OnEndSpanEventListener list */
  describe('registerEndSpanListener() / get eventListeners()', () => {
    let tracer, onEndSpan;
    before(() => {
      tracer = new Tracer();
      onEndSpan = new OnEndSpanClass();
      tracer.registerEndSpanListener(onEndSpan);
    });

    it('should register a new OnEndSpanEventListener on listners list', () => {
      const listner = tracer.eventListeners[0];
      assert.equal(listner, onEndSpan);
    });

    it('should return an OnEndSpanEventListener list', () => {
      for (const listner of tracer.eventListeners) {
        assert.ok(listner instanceof OnEndSpanClass);
      }
    });
  });

  /** Should stop the trace instance */
  describe('stop()', () => {
    it('should stop the trace instance', () => {
      const tracer = new Tracer();
      tracer.start(defaultConfig);
      tracer.stop();
      assert.ok(!tracer.active);
    });
  });

  /** Should check if the trace instance is started or stop */
  describe('get active()', () => {
    let tracer: Tracer;
    before(() => {
      tracer = new Tracer();
    });
    it('should check if the trace instance is started', () => {
      tracer.start(defaultConfig);
      assert.ok(tracer.active);
    });
    it('should check if the trace instance is stoped', () => {
      tracer.stop();
      assert.ok(!tracer.active);
    });
  });

  /** Should create and start a new RootSpan instance */
  describe('startRootSpan()', () => {
    let rootSpanLocal;
    before(() => {
      const tracer = new Tracer();
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
    let rootSpanLocal;
    before(() => {
      const tracer = new Tracer();
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
      const tracer = new Tracer();
      const config = {samplingRate: 0} as TracerConfig;
      tracer.start(config);
      tracer.startRootSpan(options, (rootSpan) => {
        assert.ok(!rootSpan.started);
      });
    });
  });

  /** Should not create the new RootSpan instance */
  describe('startRootSpan() before start()', () => {
    it('should not create the new RootSpan instance', () => {
      const tracer = new Tracer();
      tracer.startRootSpan(options, (rootSpan) => {
        assert.equal(rootSpan, null);
      });
    });
  });

  /** Should set the current root span to null */
  describe('clearCurrentRootSpan()', () => {
    it('should set the current root span to null', () => {
      const tracer = new Tracer();
      tracer.start(defaultConfig);
      tracer.startRootSpan(options, (rootSpan) => {
        tracer.clearCurrentTrace();
        assert.ok(tracer.currentRootSpan == null);
      });
    });
  });

  /** Should create and start a Span instance into a rootSpan */
  describe('startSpan()', () => {
    let span;
    before(() => {
      const tracer = new Tracer();
      tracer.start(defaultConfig);
      tracer.startRootSpan(options, (rootSpan) => {
        span = tracer.startSpan('spanName', 'spanType');
      });
    });
    it('should create a Span instance', () => {
      assert.ok(span instanceof Span);
    });
    it('should start a span', () => {
      assert.ok(span.started);
    });
  });

  /** Should not create a Span instance */
  describe('startSpan() before startRootSpan()', () => {
    it('should not create a Span instance', () => {
      const tracer = new Tracer();
      tracer.start(defaultConfig);
      const span = tracer.startSpan('spanName', 'spanType');
      assert.equal(span, null);
    });
  });

  /** Should run eventListeners when the rootSpan ends */
  describe('onEndSpan()', () => {
    it('should run eventListeners when the rootSpan ends', () => {
      const tracer = new Tracer();
      const eventListener = new OnEndSpanClass();
      tracer.registerEndSpanListener(eventListener);
      tracer.start(defaultConfig);

      tracer.startRootSpan(options, (rootSpan) => {
        rootSpan.end();
        assert.equal(eventListener.testCount, tracer.eventListeners.length);
      });
    });
  });


  /** Testing void functions */
  describe('void functions', () => {
    it('wrap()', () => {
      const tracer = new Tracer();
      tracer.start(defaultConfig);
      assert.ok(tracer.wrap(() => {}) instanceof Function);
    });

    it('wrap() before start()', () => {
      const tracer = new Tracer();
      assert.ok(tracer.wrap(() => {}) instanceof Function);
    });

    it('wrapEmitter()', () => {
      const tracer = new Tracer();
      tracer.start(defaultConfig);
      assert.strictEqual(
          typeof tracer.wrapEmitter(new EventEmitter()), 'undefined');
    });

    it('wrapEmitter() before start()', () => {
      const tracer = new Tracer();
      assert.strictEqual(
          typeof tracer.wrapEmitter(new EventEmitter()), 'undefined');
    });
  });
});