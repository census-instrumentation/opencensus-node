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

import {ConsoleExporter} from '@opencensus/opencensus-core';
import {Exporter} from '@opencensus/opencensus-core';
import {Tracer} from '@opencensus/opencensus-core';
import {TracerImpl} from '@opencensus/opencensus-core';
import {Tracing} from '@opencensus/opencensus-core';
import {Logger} from '@opencensus/opencensus-core';
import {Config, TracingConfig} from '@opencensus/opencensus-core';
import {NoopExporter} from '@opencensus/opencensus-core';

import * as logger from '@opencensus/opencensus-core';

import {TracingImpl} from '../src/trace/tracing';
import * as assert from 'assert';


const NOOP_EXPORTER = new NoopExporter();
describe('Tracing', () => {
  /** Should create a Tracing instance */
  describe('new Tracing()', () => {
    it('should create a Tracer instance', () => {
      const tracing = new TracingImpl();
      assert.ok(tracing instanceof TracingImpl);
    });
  });

  /** Should get the singleton trancing instance. */
  describe('static get instance()', () => {
    it('should get the singleton trancing instance', () => {
      const tracing = TracingImpl.instance;
      assert.ok(tracing instanceof TracingImpl);
    });
  });

  /** Should return a started tracing instance */
  describe('start()', () => {
    let tracingStarted: Tracing;
    const tracing = new TracingImpl();
    // tslint:disable:no-any
    function instanceOfLogger(object: any): object is Logger {
      return 'debug' in object;
    }

    it('should return a tracing instance', () => {
      tracingStarted = tracing.start();
      assert.ok(tracingStarted instanceof TracingImpl);
    });

    it('the tracing was started', () => {
      tracingStarted = tracing.start();
      assert.ok(tracingStarted.tracer.active);
    });    
    it('should tracing.tracer instance with logger', () =>{
      
      tracingStarted = tracing.start({logger:logger.logger('debug')});
      assert.ok(instanceOfLogger(tracingStarted.tracer.logger));
    });
    it('should tracing.tracer instance with exporter', () =>{
      
      tracingStarted = tracing.start({exporter: NOOP_EXPORTER});
      assert.equal(tracingStarted.exporter, NOOP_EXPORTER);
    });
  });

  /** Should stop the tracing instance */
  describe('stop()', () => {
    it('should stop the tracing instance', () => {
      const tracing = new TracingImpl();
      tracing.start();
      tracing.stop();
      assert.ok(!tracing.tracer.active);
    });
  });

  /** Should get the tracer instance */
  describe('get tracer()', () => {
    it('should get the tracer instance', () => {
      const tracing = new TracingImpl();
      tracing.start();
      const tracer = tracing.tracer;
      assert.ok(tracer instanceof TracerImpl);
    });
  });

  /** Should get the exporter instance */
  describe('get exporter()', () => {
    it('should get the exporter instance', () => {
      const tracing = new TracingImpl();
      tracing.start();
      const exporter = tracing.exporter;
      assert.ok(exporter instanceof ConsoleExporter);
    });
  });

  /** Should get the exporter instance */
  describe('registerExporter()', () => {
    it('should register the exporter on tracer', () => {
      const tracing = new TracingImpl();
      tracing.start();
      const exporter = tracing.exporter;
      tracing.registerExporter(exporter);
      assert.equal(tracing.tracer.eventListeners.length, 2);
    });
  });
});