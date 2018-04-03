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

import { Tracer } from '../src/trace/model/tracer';
import { RootSpan } from '../src/trace/model/rootspan';
import { Span } from '../src/trace/model/span';
import { Exporter } from '../src/exporters/exporter';
import { Sampler } from '../src/trace/config/sampler';

let assert = require('assert');

describe('Tracer', function () {
  const options = { name: "test" };
  const callback = (root) => { return root; }

  describe('new Tracer()', function () {
    it('should create a Tracer instance', function () {
      let tracer = new Tracer();
      assert.ok(tracer instanceof Tracer);
    });
  });

  describe('start()', function () {
    it('should return a tracer instance', function () {
      let tracer = new Tracer();
      let tracerStarted = tracer.start();
      assert.ok(tracerStarted instanceof Tracer);
    });

    it('the trace was started', function () {
      let tracer = new Tracer();
      let tracerStarted = tracer.start();
      assert.ok(tracerStarted.active);
    });
  });

  describe('startRootSpan()', function () {

    it('should start the rootSpan', function () {
      let tracer = new Tracer();
      tracer.start();
      let rootSpan = tracer.startRootSpan(options, callback);

      assert.ok(rootSpan.started);
    });
  });

  describe('end()', function () {
    it('should end current trace', function () {
      let tracer = new Tracer();
      let rootSpan = tracer.startRootSpan(options, callback);
      rootSpan.end();
      assert.ok(rootSpan.ended);
    });
  });

  describe('clearCurrentRootSpan()', function () {
    it('should set the current root span to null', function () {
      let tracer = new Tracer();
      let rootSpan = tracer.startRootSpan(options, callback);
      tracer.clearCurrentTrace();

      assert.ok(tracer.currentRootSpan == null);
    });
  });

  describe('startSpan()', function () {
    it('should return a Span instance', function () {
      let tracer = new Tracer();
      let rootSpan = tracer.startRootSpan(options, callback);
      let span = tracer.startSpan("spanName", "spanType");
      assert.ok(span instanceof Span);
    });

    it('should start a span', function () {
      let tracer = new Tracer();
      let rootSpan = tracer.startRootSpan(options, callback);
      let span = tracer.startSpan("spanName", "spanType");
      assert.ok(span.started);
    });
  });

});