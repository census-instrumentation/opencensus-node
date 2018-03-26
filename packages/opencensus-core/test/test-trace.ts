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

import { RootSpan } from '../src/trace/model/rootspan';
import { Span } from '../src/trace/model/span';
import { Tracer } from '../src/trace/model/tracer';
import { SpanBaseModel } from '../src/trace/types/tracetypes';

let assert = require('assert');
let tracer = new Tracer()

describe('Trace', function () {
  describe('new Trace()', function () {    
    it('should be a Trace instance', function () {
      let root = new RootSpan(tracer);
      assert.ok(root instanceof SpanBaseModel);
    });
  });

  describe('start()', function () {
    it('the trace was started', function () {
      let root = new RootSpan(tracer);
      root.start();
      assert.ok(root.started);
    });
  });

  describe('startSpan()', function () {
    let root = new RootSpan(tracer);
    root.start()
    let span = root.startSpan("spanName", "spanType");
    it('should return a Span instance', function () {
      assert.ok(span instanceof Span);
    });

    it('the new span was started', function () {
      assert.ok(span.started);
    });
  });

  describe('end()', function () {
    it('the trace was ended', function () {
      let root = new RootSpan(tracer);
      root.start()
      root.end();
      assert.ok(root.ended);
    });
  });

  describe('end() before trace started', function () {
    it('the trace was not ended', function () {
      let root = new RootSpan(tracer);
      root.end();
      assert.ok(!root.ended);
    });
  });

  describe('startSpan() before trace started', function () {
    it('should return null', function () {
      let root = new RootSpan(tracer);
      let span = root.startSpan("spanName", "spanType");
      assert.ok(span == null);
    });
  });

  describe('startSpan() after trace ended', function () {
    it('should return null', function () {
      let root = new RootSpan(tracer);
      root.start()
      root.end();
      let span = root.startSpan("spanName", "spanType");
      assert.ok(span == null);
    });
  });

});