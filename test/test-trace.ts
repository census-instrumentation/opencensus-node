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

import { Trace } from '../src/trace/model/trace';
import { Span } from '../src/trace/model/span';

let assert = require('assert');

describe('Trace', function () {
  describe('new Trace()', function () {    
    it('should be a Trace instance', function () {
      let trace = new Trace();
      assert.ok(trace instanceof Trace);
    });
  });

  describe('start()', function () {
    it('the trace was started', function () {
      let trace = new Trace();
      trace.start();
      assert.ok(trace.started);
    });
  });

  describe('startSpan()', function () {
    let trace = new Trace();
    trace.start()
    let span = trace.startSpan("spanName", "spanType");
    it('should return a Span instance', function () {
      assert.ok(span instanceof Span);
    });

    it('the new span was started', function () {
      assert.ok(span.started);
    });
  });

  describe('end()', function () {
    it('the trace was ended', function () {
      let trace = new Trace();
      trace.start()
      trace.end();
      assert.ok(trace.ended);
    });
  });

  describe('end() before trace started', function () {
    it('the trace was not ended', function () {
      let trace = new Trace();
      trace.end();
      assert.ok(!trace.ended);
    });
  });

  describe('startSpan() before trace started', function () {
    it('should return null', function () {
      let trace = new Trace();
      let span = trace.startSpan("spanName", "spanType");
      assert.ok(span == null);
    });
  });

  describe('startSpan() after trace ended', function () {
    it('should return null', function () {
      let trace = new Trace();
      trace.start()
      trace.end();
      let span = trace.startSpan("spanName", "spanType");
      assert.ok(span == null);
    });
  });

});