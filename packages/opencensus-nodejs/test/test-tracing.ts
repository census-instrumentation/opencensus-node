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

import {types} from '@opencensus/opencensus-core'; 
import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';

import {Tracing} from '../src/trace/tracing';
import * as assert from 'assert';


const NOOP_EXPORTER = new classes.NoopExporter();
describe('Tracing', () => {
  /** Should create a Tracing instance */
  describe('new Tracing()', () => {
    it('should create a Tracer instance', () => {
      const tracing = new Tracing();
      assert.ok(tracing instanceof Tracing);
    });
  });

  /** Should get the singleton trancing instance. */
  describe('static get instance()', () => {
    it('should get the singleton trancing instance', () => {
      const tracing = Tracing.instance;
      assert.ok(tracing instanceof Tracing);
    });
  });

  /** Should return a started tracing instance */
  describe('start()', () => {
    let tracingStarted: types.Tracing;
    const tracing = new Tracing();
    // tslint:disable:no-any
    function instanceOfLogger(object: any): object is types.Logger {
      return 'debug' in object;
    }

    it('should return a tracing instance', () => {
      tracingStarted = tracing.start();
      assert.ok(tracingStarted instanceof Tracing);
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
      const tracing = new Tracing();
      tracing.start();
      tracing.stop();
      assert.ok(!tracing.tracer.active);
    });
  });

  /** Should get the tracer instance */
  describe('get tracer()', () => {
    it('should get the tracer instance', () => {
      const tracing = new Tracing();
      tracing.start();
      const tracer = tracing.tracer;
      assert.ok(tracer instanceof classes.Tracer);
    });
  });

  /** Should get the exporter instance */
  describe('get exporter()', () => {
    it('should get the exporter instance', () => {
      const tracing = new Tracing();
      tracing.start();
      const exporter = tracing.exporter;
      assert.ok(exporter instanceof classes.ConsoleExporter);
    });
  });

  /** Should get the exporter instance */
  describe('registerExporter()', () => {
    it('should register the exporter on tracer', () => {
      const tracing = new Tracing();
      tracing.start();
      const exporter = tracing.exporter;
      tracing.registerExporter(exporter);
      assert.equal(tracing.tracer.eventListeners.length, 2);
    });
  });
});