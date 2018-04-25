/**
 * Copyright 2018 OpenCensus Authors.
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
import * as assert from 'assert';
import * as http from 'http';
import * as mocha from 'mocha';
import * as nock from 'nock';

import {ZipkinExporterOptions, ZipkinTraceExporter} from '../src/zipkin';

/** Interface with request response model */
interface RequestResponse {
  statusCode: number;
  statusMessage: string;
}

/** Default options for zipkin tests */
const zipkinOptions = {
  url: 'http://localhost:9411/api/v2/spans',
  serviceName: 'opencensus-tests'
} as ZipkinExporterOptions;

/** Default config for traces tests */
const defaultConfig: types.TracerConfig = {
  samplingRate: 1
};

/** Run a nock server to replace zipkin service */
const runNockServer = () => {
  nock('http://localhost:9411/')
      .persist()
      .post('/api/v2/spans')
      .reply(202)
      .post('/api/v2/spanswrong')
      .reply(404);
};

/**
 * Checks if zipkin service is not running for tests
 */
const isNotZipkinRunning = (callback: Function) => {
  http.get('http://localhost:9411', (res) => {
        if (res.statusCode !== 200) {
          callback();
        }
      }).on('error', (e) => {
    callback();
  });
};

/** Checking if zipkin service is running, otherwise run a nock server */
before((done) => {
  isNotZipkinRunning(() => {
    runNockServer();
    done();
  });
});

/** Zipkin tests */
describe('Zipkin Exporter', function() {
  /** Desabling the timeout for tests */
  this.timeout(0);
  /** Should create a Zipkin instance */
  describe('new Zipkin()', () => {
    it('should create a Zipkin instance', () => {
      const zipkin = new ZipkinTraceExporter(zipkinOptions);
      assert.ok(zipkin instanceof ZipkinTraceExporter);
    });
  });

  /** Should called when a rootSpan ended */
  describe('onEndSpan()', () => {
    it('Should called when a rootSpan ended', () => {
      const exporter = new ZipkinTraceExporter(zipkinOptions);
      const tracer = new classes.Tracer();
      tracer.registerEndSpanListener(exporter);
      tracer.start(defaultConfig);

      tracer.startRootSpan({name: 'root-test'}, (rootSpan: types.RootSpan) => {
        const span = rootSpan.startChildSpan('spanTest', 'spanType');
        span.end();
        rootSpan.end();
        assert.ok(exporter.buffer.getQueue().length > 0);
      });
    });
  });

  /** Should send traces to Zipkin service */
  describe('publish()', () => {
    it('should send traces to Zipkin service', () => {
      const exporter = new ZipkinTraceExporter(zipkinOptions);
      const tracer = new classes.Tracer();
      tracer.start(defaultConfig);

      return tracer.startRootSpan(
          {name: 'root-test'}, async (rootSpan: types.RootSpan) => {
            const span = rootSpan.startChildSpan('spanTest', 'spanType');
            span.end();
            rootSpan.end();
            return exporter.publish([rootSpan]).then((result) => {
              const resultObject = result as RequestResponse;
              assert.equal(resultObject.statusCode, 202);
            });
          });
    });
  });

  /** Should send traces to Zipkin service */
  describe('publish() with a wrong Zipkin url', () => {
    it('shouldn\'t send traces to Zipkin service and return an 404 error',
       () => {
         /** adding a string to get a wrong url */
         zipkinOptions.url += 'wrong';
         const exporter = new ZipkinTraceExporter(zipkinOptions);
         const tracer = new classes.Tracer();
         tracer.start(defaultConfig);

         return tracer.startRootSpan(
             {name: 'root-test'}, async (rootSpan: types.RootSpan) => {
               const span = rootSpan.startChildSpan('spanTest', 'spanType');
               span.end();
               rootSpan.end();
               return exporter.publish([rootSpan]).then((result) => {
                 const resultObject = result as RequestResponse;
                 assert.equal(resultObject.statusCode, 404);
               });
             });
       });
  });
});
