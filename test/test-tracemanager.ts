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

import { TraceManager } from '../src/trace/tracemanager';
import { Trace } from '../src/trace/trace';
import { Span } from '../src/trace/span';

let assert = require('assert');

describe('TraceManager', function () {
  describe('new TraceManager()', function () {
    it('should be a TraceManager instance', function () {
      let traceManager = new TraceManager();
      assert.ok(traceManager instanceof TraceManager);
    });
  });

  describe('start()', function () {
    let traceManager = new TraceManager();
    let traceManagerStarted = traceManager.start();

    it('should return a TraceManager instance', function () {
      assert.ok(traceManagerStarted instanceof TraceManager);
    });

    it('should set true on active property', function () {
      assert.ok(traceManagerStarted.active);
    });
  });

  describe('startTrace()', function () {
    let traceManager;
    let trace;

    before(() => {
      traceManager = new TraceManager();
      trace = traceManager.startTrace();
    })

    it('should return a Trace instance', function () {
      assert.ok(trace instanceof Trace);
    });

    it('the new trace was set as current trace', function () {
      assert.equal(traceManager.currentTrace.id, trace.id);
    });

    it('the new trace was started', function () {
      assert.ok(trace.started);
    });
  });

  describe('endTrace()', function () {
    it('the current trace was ended', function () {
      let traceManager = new TraceManager();
      let trace = traceManager.startTrace();
      traceManager.endTrace();
      assert.ok(trace.ended);
    });
  });

  describe('clearCurrentTrace()', function () {
    it('the current trace is null', function () {
      let traceManager = new TraceManager();
      let trace = traceManager.startTrace();
      traceManager.clearCurrentTrace();
      assert.ok(traceManager.currentTrace == null);
    });
  });

  describe('startSpan()', function () {
    let traceManager = new TraceManager();
    let trace = traceManager.startTrace();
    let span = traceManager.startSpan("spanName", "spanType");
    it('should return a Span instance', function () {
      assert.ok(span instanceof Span);
    });

    it('span was started', function () {
      assert.ok(span.started);
    });
  });

});