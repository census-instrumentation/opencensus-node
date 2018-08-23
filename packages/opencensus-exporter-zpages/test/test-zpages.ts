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

import {RootSpan, TracerConfig} from '@opencensus/core';
import * as assert from 'assert';
import axios from 'axios';
import * as http from 'http';
import * as qs from 'querystring';

import {ZpagesExporter, ZpagesExporterOptions} from '../src/zpages';
import {TraceConfigzData, TraceConfigzParams} from '../src/zpages-frontend/page-handlers/traceconfigz.page-handler';
import {TracezData, TracezParams} from '../src/zpages-frontend/page-handlers/tracez.page-handler';

/** Default options for zpages tests */
const options = {
  port: 8081,
  spanNames: ['predefined/span1', 'predefined/span2'],
  startServer: false
} as ZpagesExporterOptions;

/** Zpages Server URL, just to support tests, shouldn't be changed */
const zpagesServerUrl = 'http://localhost:' + options.port;

/** Default config for traces tests */
const defaultConfig: TracerConfig = {
  samplingRate: 1.0
};

/**
 * A class that acts as a client for getting Zpages data.
 * It is used by tests to ensure that information reported by the Zpages UI
 * is consistent with the rest of the application.
 */
class ZpagesJSONClient {
  constructor(private readonly origin: string) {}

  private async getEndpoint<P, R>(endpoint: string, query?: Partial<P>):
      Promise<R> {
    query = Object.assign({json: '1'}, query);
    const response =
        await axios.get(`${this.origin}/${endpoint}?${qs.stringify(query)}`);
    return response.data as R;
  }

  /**
   * Gets the data model backing the tracez UI.
   * @param query Optional query parameters.
   */
  async getTracez(query?: Partial<TracezParams>): Promise<TracezData> {
    return this.getEndpoint<TracezParams, TracezData>('tracez', query);
  }

  /**
   * Gets the data model backing the traceconfigz UI.
   * @param query Optional query parameters.
   */
  async getTraceConfigz(query?: Partial<TraceConfigzParams>):
      Promise<TraceConfigzData> {
    return this.getEndpoint<TraceConfigzParams, TraceConfigzData>(
        'tracez', query);
  }
}

/** Zpages tests */
describe('Zpages Exporter', () => {
  const zpagesClient = new ZpagesJSONClient(`http://localhost:${options.port}`);

  /** Should create a ZpagesExporter instance with predefined span names */
  describe('new ZpagesExporter()', () => {
    let zpages: ZpagesExporter;

    before((done) => {
      zpages = new ZpagesExporter(options);
      zpages.startServer(done);
    });

    after((done) => {
      zpages.stopServer(done);
    });

    it('Should create predefined span names in the zpages', async () => {
      // Get the data backing the current tracez UI.
      const tracezData = await zpagesClient.getTracez();
      for (const name of options.spanNames) {
        // Check that each span name is contained in the data backing the
        // tracez view.
        assert.ok(tracezData.spanCells.some(cell => cell.name === name));
      }
    });
  });

  /** Should start a new span and get it with zpages */
  describe('when a span is started and ended', () => {
    let zpages: ZpagesExporter;

    before((done) => {
      /** Creating here because tracing is a singleton */
      const tracing = require('@opencensus/nodejs');
      zpages = new ZpagesExporter(options);

      tracing.start(defaultConfig);
      tracing.registerExporter(zpages);

      tracing.tracer.startRootSpan(
          {name: 'rootSpanTest'}, (rootSpan: RootSpan) => {
            const span =
                tracing.tracer.startChildSpan('spanNameTest', 'spanType');
            span.end();
            rootSpan.end();
          });
      zpages.startServer(done);
    });

    after((done) => {
      zpages.stopServer(done);
    });

    it('should create a corresponding cell in the tracez UI', async () => {
      // Get the data backing the current tracez UI.
      const zpagesData = await zpagesClient.getTracez();
      // Check that exactly one cell was created for the root span.
      assert.strictEqual(
          zpagesData.spanCells.filter(cell => cell.name === 'rootSpanTest')
              .length,
          1);
      // Check that exactly one cell was created for the child span.
      assert.strictEqual(
          zpagesData.spanCells.filter(cell => cell.name === 'spanNameTest')
              .length,
          1);
    });
  });

  describe('when a span is started, but not ended', () => {
    let zpages: ZpagesExporter;

    before((done) => {
      /** Creating here because tracing is a singleton */
      const tracing = require('@opencensus/nodejs');
      zpages = new ZpagesExporter(options);

      tracing.start(defaultConfig);
      tracing.registerExporter(zpages);

      tracing.tracer.startRootSpan({name: 'runningSpanTest'}, () => {});
      zpages.startServer(done);
    });

    after((done) => {
      zpages.stopServer(done);
    });

    it('should appear in the RUNNING category in the tracez UI', async () => {
      // Get the data backing the current tracez UI for the currently running
      // span.
      const zpagesData = await zpagesClient.getTracez(
          {tracename: 'runningSpanTest', type: 'RUNNING'});
      // selectedTraces should be populated.
      assert.ok(zpagesData.selectedTraces);
      // Its name should be that of the currently running span.
      assert.strictEqual(zpagesData.selectedTraces!.name, 'runningSpanTest');
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
