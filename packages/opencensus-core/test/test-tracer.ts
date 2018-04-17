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

import {Exporter} from '../src/exporters/types';
import {TracerConfig} from '../src/trace/config/types';
import {RootSpanImpl} from '../src/trace/model/rootspan';
import {SpanImpl} from '../src/trace/model/span';
import {TracerImpl} from '../src/trace/model/tracer';
import {RootSpan, Span, Tracer} from '../src/trace/model/types';

const defaultConfig: TracerConfig = {
  samplingRate: 1
};


describe('Tracer', () => {
  const options = {name: 'test'};

  describe('new Tracer()', () => {
    it('should create a Tracer instance', () => {
      const tracer = new TracerImpl();
      assert.ok(tracer instanceof TracerImpl);
    });
  });

  describe('start()', () => {
    it('should return a tracer instance', () => {
      const tracer = new TracerImpl();
      const tracerStarted = tracer.start(defaultConfig);
      assert.ok(tracerStarted instanceof TracerImpl);
    });

    it('the trace was started', () => {
      const tracer = new TracerImpl();
      const tracerStarted = tracer.start(defaultConfig);
      assert.ok(tracerStarted.active);
    });
  });

  describe('startRootSpan()', () => {
    it('should start the rootSpan', () => {
      const tracer = new TracerImpl();
      tracer.start(defaultConfig);
      tracer.startRootSpan(options, (root) => {
        assert.ok(root.started);
      });
    });

    describe('end()', () => {
      it('should end current trace', () => {
        const tracer = new TracerImpl();
        tracer.start(defaultConfig);
        const rootSpan = tracer.startRootSpan(options, (root) => {
          root.end();
          assert.ok(root.ended);
        });
      });
    });

    describe('clearCurrentRootSpan()', () => {
      it('should set the current root span to null', () => {
        const tracer = new TracerImpl();
        tracer.start(defaultConfig);
        tracer.startRootSpan(options, (root) => {
          tracer.clearCurrentTrace();
          assert.ok(tracer.currentRootSpan == null);
        });
      });
    });

    describe('startSpan()', () => {
      it('should return a Span instance', () => {
        const tracer = new TracerImpl();
        tracer.start(defaultConfig);
        tracer.startRootSpan(options, (root) => {
          const span = tracer.startSpan('spanName', 'spanType');
          assert.ok(span instanceof SpanImpl);
        });
      });

      it('should start a span', () => {
        const tracer = new TracerImpl();
        tracer.start(defaultConfig);
        tracer.startRootSpan(options, (root) => {
          const span = tracer.startSpan('spanName', 'spanType');
          assert.ok(span.started);
        });
      });
    });
  });
});