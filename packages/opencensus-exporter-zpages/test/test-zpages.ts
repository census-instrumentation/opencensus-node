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
import * as assert from 'assert';
import * as http from 'http';
import * as mocha from 'mocha';

import {ZpagesExporter, ZpagesExporterOptions} from '../src/zpages';

/** Default options for zpages tests */
const options = {
  port: 8081,
  spanNames: ['predefined/span1', 'predefined/span2'],
  startServer: false
} as ZpagesExporterOptions;

/** Zpages Server URL, just to support tests, shouldn't be changed */
const zpagesServerUrl = 'http://localhost:' + options.port;

/** Default config for traces tests */
const defaultConfig: types.TracerConfig = {
  samplingRate: 0.2
};

/** Zpages tests */
describe('Zpages Exporter', () => {
  /** Should create a ZpagesExporter instance with predefined span names */
  describe('new ZpagesExporter()', () => {
    const zpages = new ZpagesExporter(options);
    it('Should create a ZpagesExporter instance', () => {
      /**
       * This test ensures that if there are any exceptions during the
       * constructor execution the test will fail
       */
      assert.ok(zpages instanceof ZpagesExporter);
    });
    it('Should create predefined span names in the zpages', () => {
      for (const name of options.spanNames) {
        /** Array within all same name spans */
        const spans = zpages.getAllTraces()[name];
        /** Check if the first position span has the same name */
        assert.strictEqual(spans[0].name, name);
      }
    });
  });

  /** Should start a new span and get it with zpages */
  describe('starting a new span', () => {
    let zpages: ZpagesExporter;

    before((done) => {
      /** Creating here because tracing is a singleton */
      const tracing = require('@opencensus/nodejs');
      zpages = new ZpagesExporter(options);

      tracing.start(defaultConfig);
      tracing.registerExporter(zpages);

      tracing.tracer.startRootSpan(
          {name: 'rootSpanTest'}, (rootSpan: types.RootSpan) => {
            const span =
                tracing.tracer.startChildSpan('spanNameTest', 'spanType');
            span.end();
            rootSpan.end();
            done();
          });
    });

    it('Should create span in the zpages', () => {
      /** Array within all same name spans */
      let spans = zpages.getAllTraces()['rootSpanTest'];
      /** Check if the first position span has the same name */
      assert.strictEqual(spans[0].name, 'rootSpanTest');

      /** Array within all same name spans */
      spans = zpages.getAllTraces()['spanNameTest'];
      /** Check if the first position span has the same name */
      assert.strictEqual(spans[0].name, 'spanNameTest');
    });
  });

  describe('catching a running span', () => {
    let zpages: ZpagesExporter;

    before((done) => {
      /** Creating here because tracing is a singleton */
      const tracing = require('@opencensus/nodejs');
      zpages = new ZpagesExporter(options);

      tracing.start(defaultConfig);
      tracing.registerExporter(zpages);

      tracing.tracer.startRootSpan({name: 'runningSpanTest'}, () => {
        done();
      });
    });

    it('Should get a running span in the zpages', () => {
      /** Array within all same name spans */
      const spans = zpages.getAllTraces()['runningSpanTest'];
      /** Check if the first position span has the same name */
      assert.strictEqual(spans[0].name, 'runningSpanTest');
      assert.ok(spans[0].started);
      assert.ok(!spans[0].ended);
    });
  });

  describe('running Zpages Server', () => {
    let zpages: ZpagesExporter;

    /** Starting the server */
    before((done) => {
      zpages = new ZpagesExporter(options);
      zpages.startServer(done);
    });

    it('Should access tracez page', (done) => {
      http.get(zpagesServerUrl + '/tracez', (res) => {
            assert.strictEqual(res.statusCode, 200);
            done();
          }).on('error', done);
    });

    it('Should access trace config page', (done) => {
      http.get(zpagesServerUrl + '/traceconfigz', (res) => {
            assert.strictEqual(res.statusCode, 200);
            done();
          }).on('error', done);
    });

    after(() => {
      zpages.stopServer();
    });
  });
});
