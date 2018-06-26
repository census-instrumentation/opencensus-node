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

import {CoreTracer, RootSpan, TracerConfig} from '@opencensus/core';
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

/** Zipkin host url */
const zipkinHost = 'http://localhost:9411';
/** Zipkin post path url */
const postPath = '/api/v2/spans';
/**
 * Controls if the tests will use a real network or not
 * true to use a real zipkin service
 * false to use a nock server
 */
const OPENCENSUS_NETWORK_TESTS =
    ['true', 'TRUE', '1'].indexOf(process.env.OPENCENSUS_NETWORK_TESTS) > -1;

/** Default options for zipkin tests */
const zipkinOptions = {
  url: zipkinHost + postPath,
  serviceName: 'opencensus-tests'
} as ZipkinExporterOptions;

/** Default config for traces tests */
const defaultConfig: TracerConfig = {
  samplingRate: 1
};

/** Run a nock server to replace zipkin service */
const runNockServer = () => {
  nock(zipkinHost)
      .persist()
      .post(postPath)
      .reply(202)
      .post('/wrong')
      .reply(404);
};

/** Checking if tests will use a real network, otherwise run a nock server */
before(() => {
  if (!OPENCENSUS_NETWORK_TESTS) {
    runNockServer();
  }
});

/** Zipkin tests */
describe('Zipkin Exporter', function() {
  /** Desabling the timeout for tests */
  this.timeout(0);

  /** Should called when a rootSpan ended */
  describe('onEndSpan()', () => {
    it('Should add spans to the exporter buffer', () => {
      const exporter = new ZipkinTraceExporter(zipkinOptions);
      const tracer = new CoreTracer();
      tracer.registerSpanEventListener(exporter);
      tracer.start(defaultConfig);

      tracer.startRootSpan({name: 'root-test'}, (rootSpan: RootSpan) => {
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
      const tracer = new CoreTracer();
      tracer.start(defaultConfig);

      return tracer.startRootSpan(
          {name: 'root-test'}, async (rootSpan: RootSpan) => {
            const span = rootSpan.startChildSpan('spanTest', 'spanType');
            span.end();
            rootSpan.end();
            return exporter.publish([rootSpan, rootSpan]).then((result) => {
              assert.equal(result.statusCode, 202);
            });
          });
    });
  });

  describe('publish() with a wrong Zipkin url', () => {
    it('shouldn\'t send traces to Zipkin service and return an 404 error',
       () => {
         /** Creating new options with a wrong url */
         const options = {
           url: zipkinHost + '/wrong',
           serviceName: 'opencensus-tests'
         } as ZipkinExporterOptions;

         const exporter = new ZipkinTraceExporter(options);
         const tracer = new CoreTracer();
         tracer.start(defaultConfig);

         return tracer.startRootSpan(
             {name: 'root-test'}, async (rootSpan: RootSpan) => {
               const span = rootSpan.startChildSpan('spanTest', 'spanType');
               span.end();
               rootSpan.end();
               return exporter.publish([rootSpan]).then((result) => {
                 assert.equal(result.statusCode, 404);
               });
             });
       });
  });
});
