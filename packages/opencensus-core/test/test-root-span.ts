/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';

import {RootSpan} from '../src/trace/model/rootspan';
import {Span} from '../src/trace/model/span';
import {Tracer} from '../src/trace/model/tracer';
import {SpanBaseModel} from '../src/trace/types/tracetypes';

let tracer = new Tracer();

describe('RootSpan', function() {
  /**
   * Should create a RootSpan instance
   */
  describe('new RootSpan()', function() {
    it('should create a RootSpan instance', function() {
      let root = new RootSpan(tracer);
      assert.ok(root instanceof SpanBaseModel);
    });
  });

  /**
   * Should create and start a RootSpan instance
   */
  describe('start()', function() {
    it('should start a RootSpan instance', function() {
      let root = new RootSpan(tracer);
      root.start();
      assert.ok(root.started);
    });
  });

  /**
   * Should check type and a span was started
   */
  describe('startSpan()', function() {
    let root, span;

    before(function() {
      root = new RootSpan(tracer);
      root.start();
      span = root.startSpan('spanName', 'spanType');
    });

    it('should check span instance type', function() {
      assert.ok(span instanceof Span);
    });

    it('should check if a new span was started', function() {
      assert.ok(span.started);
    });
  });

  /**
   * Should start and end a rootspan properly
   */
  describe('end()', function() {
    it('should end the trace', function() {
      let root = new RootSpan(tracer);
      root.start();
      root.end();
      assert.ok(root.ended);
    });
  });

  /**
   * Should not end a rootspan which was not started
   */
  describe('end() before trace started', function() {
    it('should not end trace', function() {
      let root = new RootSpan(tracer);
      root.end();
      assert.ok(!root.ended);
    });
  });

  /**
   * Should not start a span from a not started rootspan
   */
  describe('startSpan() before trace started', function() {
    it('should not create span', function() {
      let root = new RootSpan(tracer);
      let span = root.startSpan('spanName', 'spanType');
      assert.ok(span == null);
    });
  });

  /**
   * Should not create a span from a ended rootspan
   */
  describe('startSpan() after trace ended', function() {
    it('should not create span', function() {
      let root = new RootSpan(tracer);
      root.start();
      root.end();
      let span = root.startSpan('spanName', 'spanType');
      assert.ok(span == null);
    });
  });
});
