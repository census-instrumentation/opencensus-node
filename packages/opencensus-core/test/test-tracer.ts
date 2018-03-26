/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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

import { Tracer, defaultConfig } from '../src/trace/model/tracer';
import { RootSpan } from '../src/trace/model/trace';
import { Span } from '../src/trace/model/span';
import { Exporter, NoopExporter } from '../src/exporters/exporter';

let assert = require('assert');


let noopExporter = new NoopExporter ();

describe('Tracer', function () {
  describe('new Tracer()', function () {
    it('should be a Tracer instance', function () {
      let tracer = new Tracer();
      assert.ok(tracer instanceof Tracer);
    });
  });

  describe('start()', function () {
    let tracer = new Tracer();
    let tracerStarted = tracer.start();

    it('should return a tracer instance', function () {
      assert.ok(tracerStarted instanceof Tracer);
    });

    it('should set true on active property', function () {
      assert.ok(tracerStarted.active);
    });
  });

  describe('startTrace()', function () {
    let tracer;
    let trace;

    before(() => {
      tracer = new Tracer();
      trace = tracer.startTrace();
    })

    it('should return a Trace instance', function () {
      assert.ok(trace instanceof RootSpan);
    });

    it('the new trace was set as current trace', function () {
      assert.equal(tracer.currentTrace.id, trace.id);
    });

    it('the new trace was started', function () {
      assert.ok(trace.started);
    });
  });

  describe('endTrace()', function () {
    it('the current trace was ended', function () {
      let tracer = new Tracer();
      let trace = tracer.startRootSpan();
      tracer.endRootSpan();
      assert.ok(trace.ended);
    });
  });

  describe('clearCurrentTrace()', function () {
    it('the current trace is null', function () {
      let tracer = new Tracer();
      let trace = tracer.startRootSpan();
      tracer.clearCurrentTrace();
      assert.ok(tracer.currentTrace == null);
    });
  });

  describe('startSpan()', function () {
    let tracer = new Tracer();
    let trace = tracer.startRootSpan();
    let span = tracer.startSpan("spanName", "spanType");
    it('should return a Span instance', function () {
      assert.ok(span instanceof Span);
    });

    it('span was started', function () {
      assert.ok(span.started);
    });
  });

});