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

import {AggregationType, CountData, DistributionData, globalStats, Measure, Measurement, MeasureUnit, Span, SpanKind, SumData, TagMap, TracerConfig} from '@opencensus/core';
import * as assert from 'assert';
import axios from 'axios';
import * as http from 'http';
import * as qs from 'querystring';
import {ZpagesExporter, ZpagesExporterOptions} from '../src/zpages';
import {RpczData} from '../src/zpages-frontend/page-handlers/rpcz.page-handler';
import {StatsViewData, StatszParams} from '../src/zpages-frontend/page-handlers/statsz.page-handler';
import {TraceConfigzData, TraceConfigzParams} from '../src/zpages-frontend/page-handlers/traceconfigz.page-handler';
import {TracezData, TracezParams} from '../src/zpages-frontend/page-handlers/tracez.page-handler';

/** Default options for zpages tests */
const options: ZpagesExporterOptions = {
  port: 8081,
  spanNames: ['predefined/span1', 'predefined/span2'],
  startServer: false
};

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

  /**
   * Gets the data model backing the statsz UI.
   * @param query Optional query parameters.
   */
  async getStatsz(query?: Partial<StatszParams>): Promise<StatsViewData> {
    return this.getEndpoint<StatszParams, StatsViewData>('statsz', query);
  }

  /**
   * Gets the data model backing the rpcz UI.
   * @param query Optional query parameters.
   */
  async getRpcz(query?: Partial<StatszParams>): Promise<RpczData> {
    return this.getEndpoint<StatszParams, RpczData>('rpcz', query);
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

      tracing.tracer.startRootSpan({name: 'rootSpanTest'}, (rootSpan: Span) => {
        const span = tracing.tracer.startChildSpan(
            {name: 'spanNameTest', kind: SpanKind.CLIENT});
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

    it('should access tracez page', (done) => {
      http.get(zpagesServerUrl + '/tracez', (res) => {
            assert.strictEqual(res.statusCode, 200);
            done();
          }).on('error', done);
    });

    it('should access trace config page', (done) => {
      http.get(zpagesServerUrl + '/traceconfigz', (res) => {
            assert.strictEqual(res.statusCode, 200);
            done();
          }).on('error', done);
    });

    it('should access statsz page', (done) => {
      http.get(zpagesServerUrl + '/statsz', (res) => {
            assert.strictEqual(res.statusCode, 200);
            done();
          }).on('error', done);
    });

    it('should access rpcz page', (done) => {
      http.get(zpagesServerUrl + '/rpcz', (res) => {
            assert.strictEqual(res.statusCode, 200);
            done();
          }).on('error', done);
    });

    after(() => {
      zpages.stopServer();
    });
  });

  // STATS TESTS
  describe('when a view is accessed in statsz page', () => {
    const tagKeys = [{name: 'testKey1'}, {name: 'testKey2'}];
    const tagValues = [{value: 'testValue1'}, {value: 'testValue2'}];
    const tagMap = new TagMap();
    tagMap.set(tagKeys[0], tagValues[0]);
    tagMap.set(tagKeys[1], tagValues[1]);

    let zpages: ZpagesExporter;
    let measure: Measure;
    let zpagesData: StatsViewData;
    let measurement: Measurement;
    let measurement2: Measurement;

    beforeEach((done) => {
      zpages = new ZpagesExporter(options);
      globalStats.registerExporter(zpages);
      measure = globalStats.createMeasureDouble(
          'testMeasureDouble', MeasureUnit.UNIT, 'A test measure');
      measurement = {measure, value: 22};
      measurement2 = {measure, value: 11};
      zpages.startServer(done);
    });

    afterEach((done) => {
      zpages.stopServer(done);
      globalStats.clear();
    });

    describe('with COUNT aggregation type', () => {
      it('should get view information', async () => {
        const view = globalStats.createView(
            'test/CountView', measure, AggregationType.COUNT, tagKeys,
            'A count test');
        globalStats.registerView(view);
        globalStats.record([measurement, measurement2], tagMap);

        zpagesData = await zpagesClient.getStatsz({path: 'test/CountView'});

        assert.strictEqual(zpagesData.view.name, 'test/CountView');
        assert.strictEqual(zpagesData.view.description, 'A count test');
        assert.strictEqual(zpagesData.view.measure.name, 'testMeasureDouble');
        assert.strictEqual(zpagesData.view.aggregation, AggregationType.COUNT);
      });

      it('should get stats for view', async () => {
        const view = globalStats.createView(
            'test/CountView', measure, AggregationType.COUNT, tagKeys,
            'A count test');
        globalStats.registerView(view);
        globalStats.record([measurement, measurement2], tagMap);

        zpagesData = await zpagesClient.getStatsz({path: 'test/CountView'});

        const data = zpagesData.statsData[0];
        const snapshot = data.snapshot as CountData;
        assert.deepEqual(data.tagKeys, tagKeys);
        assert.deepEqual(data.tagValues, tagValues);
        assert.strictEqual(snapshot.value, 2);
      });
    });

    describe('with SUM aggregation type', () => {
      it('should get view information', async () => {
        globalStats.registerExporter(zpages);
        const view = globalStats.createView(
            'test/SumView', measure, AggregationType.SUM, tagKeys,
            'A sum test');
        globalStats.registerView(view);
        globalStats.record([measurement, measurement2], tagMap);

        zpagesData = await zpagesClient.getStatsz({path: 'test/SumView'});

        assert.strictEqual(zpagesData.view.name, 'test/SumView');
        assert.strictEqual(zpagesData.view.description, 'A sum test');
        assert.strictEqual(zpagesData.view.measure.name, 'testMeasureDouble');
        assert.strictEqual(zpagesData.view.aggregation, AggregationType.SUM);
      });

      it('should get stats for view', async () => {
        globalStats.registerExporter(zpages);
        const view = globalStats.createView(
            'test/SumView', measure, AggregationType.SUM, tagKeys,
            'A sum test');
        globalStats.registerView(view);
        globalStats.record([measurement, measurement2], tagMap);

        zpagesData = await zpagesClient.getStatsz({path: 'test/SumView'});

        const data = zpagesData.statsData[0];
        const snapshot = data.snapshot as SumData;
        assert.deepEqual(data.tagKeys, tagKeys);
        assert.deepEqual(data.tagValues, tagValues);
        assert.strictEqual(snapshot.value, 33);
      });
    });

    describe('with LAST VALUE aggregation type', () => {
      it('should get view information', async () => {
        globalStats.registerExporter(zpages);
        const view = globalStats.createView(
            'test/LastValueView', measure, AggregationType.LAST_VALUE, tagKeys,
            'A last value test');
        globalStats.registerView(view);
        globalStats.record([measurement, measurement2], tagMap);

        zpagesData = await zpagesClient.getStatsz({path: 'test/LastValueView'});

        assert.strictEqual(zpagesData.view.name, 'test/LastValueView');
        assert.strictEqual(zpagesData.view.description, 'A last value test');
        assert.strictEqual(zpagesData.view.measure.name, 'testMeasureDouble');
        assert.strictEqual(
            zpagesData.view.aggregation, AggregationType.LAST_VALUE);
      });

      it('should get stats for view', async () => {
        globalStats.registerExporter(zpages);
        const view = globalStats.createView(
            'test/LastValueView', measure, AggregationType.LAST_VALUE, tagKeys,
            'A last value test');
        globalStats.registerView(view);
        globalStats.record([measurement, measurement2], tagMap);

        zpagesData = await zpagesClient.getStatsz({path: 'test/LastValueView'});

        const data = zpagesData.statsData[0];
        const snapshot = data.snapshot as SumData;
        assert.deepEqual(data.tagKeys, tagKeys);
        assert.deepEqual(data.tagValues, tagValues);
        assert.strictEqual(snapshot.value, 11);
      });
    });

    describe('with DISTRIBUTION aggregation type', () => {
      it('should get view information', async () => {
        const boundaries = [10, 20, 30, 40];
        globalStats.registerExporter(zpages);
        const view = globalStats.createView(
            'test/DistributionView', measure, AggregationType.DISTRIBUTION,
            tagKeys, 'A distribution test', boundaries);
        globalStats.registerView(view);
        globalStats.record([measurement, measurement2], tagMap);

        zpagesData =
            await zpagesClient.getStatsz({path: 'test/DistributionView'});

        assert.strictEqual(zpagesData.view.name, 'test/DistributionView');
        assert.strictEqual(zpagesData.view.description, 'A distribution test');
        assert.strictEqual(zpagesData.view.measure.name, 'testMeasureDouble');
        assert.strictEqual(
            zpagesData.view.aggregation, AggregationType.DISTRIBUTION);
      });

      it('should get stats for view', async () => {
        const boundaries = [10, 20, 30, 40];
        globalStats.registerExporter(zpages);
        const view = globalStats.createView(
            'test/DistributionView', measure, AggregationType.DISTRIBUTION,
            tagKeys, 'A distribution test', boundaries);
        globalStats.registerView(view);
        globalStats.record([measurement, measurement2], tagMap);

        zpagesData =
            await zpagesClient.getStatsz({path: 'test/DistributionView'});

        const data = zpagesData.statsData[0];
        const snapshot = data.snapshot as DistributionData;
        assert.deepEqual(data.tagKeys, tagKeys);
        assert.deepEqual(data.tagValues, tagValues);
        assert.strictEqual(snapshot.count, 2);
        assert.strictEqual(snapshot.mean, 16.5);
        assert.strictEqual(snapshot.sumOfSquaredDeviation, 60.5);
      });
    });
  });

  describe('when a view is accessed in rpcz page', () => {
    let zpages: ZpagesExporter;
    let rpczData: RpczData;
    const boundaries = [10, 20, 30, 40];

    beforeEach((done) => {
      zpages = new ZpagesExporter(options);
      globalStats.registerExporter(zpages);
      zpages.startServer(done);
    });

    afterEach((done) => {
      zpages.stopServer(done);
      globalStats.clear();
    });

    it('should get the sent stats', async () => {
      const GRPC_CLIENT_METHOD = {name: 'grpc_client_method'};
      const GRPC_CLIENT_STATUS = {name: 'grpc_client_status'};
      const GRPC_CLIENT_METHOD_V = {value: 'ExampleMethod'};
      const GRPC_CLIENT_STATUS_V = {value: 'DEADLINE_EXCEEDED'};
      const tagMap = new TagMap();
      tagMap.set(GRPC_CLIENT_METHOD, GRPC_CLIENT_METHOD_V);
      tagMap.set(GRPC_CLIENT_STATUS, GRPC_CLIENT_STATUS_V);

      const measure = globalStats.createMeasureDouble(
          'grpc.io/client/sent_bytes_per_rpc', MeasureUnit.BYTE,
          'Total bytes sent across all request messages per RPC');

      const measure2 = globalStats.createMeasureDouble(
          'grpc.io/client/received_bytes_per_rpc', MeasureUnit.BYTE,
          'Total bytes received across all request messages per RPC');

      const measure3 = globalStats.createMeasureDouble(
          'grpc.io/client/roundtrip_latency', MeasureUnit.MS,
          'Time between first byte of request sent to last byte of response received or terminal error');

      const measure4 = globalStats.createMeasureDouble(
          'grpc.io/client/started_rpcs', MeasureUnit.UNIT,
          'Number of started client RPCs.');

      const view1 = globalStats.createView(
          'grpc.io/client/sent_bytes_per_rpc', measure,
          AggregationType.DISTRIBUTION,
          [GRPC_CLIENT_METHOD, GRPC_CLIENT_STATUS], 'Sent bytes per RPC',
          boundaries);
      globalStats.registerView(view1);

      const view2 = globalStats.createView(
          'grpc.io/client/received_bytes_per_rpc', measure2,
          AggregationType.DISTRIBUTION,
          [GRPC_CLIENT_METHOD, GRPC_CLIENT_STATUS], 'Sent bytes per RPC',
          boundaries);
      globalStats.registerView(view2);

      const view3 = globalStats.createView(
          'grpc.io/client/roundtrip_latency', measure3,
          AggregationType.DISTRIBUTION,
          [GRPC_CLIENT_METHOD, GRPC_CLIENT_STATUS], 'Latency in msecs',
          boundaries);
      globalStats.registerView(view3);

      const view4 = globalStats.createView(
          'grpc.io/client/completed_rpcs', measure3, AggregationType.COUNT,
          [GRPC_CLIENT_METHOD, GRPC_CLIENT_STATUS],
          'Number of completed client RPCs');
      globalStats.registerView(view4);

      const view5 = globalStats.createView(
          'grpc.io/client/started_rpcs', measure4, AggregationType.COUNT,
          [GRPC_CLIENT_METHOD, GRPC_CLIENT_STATUS],
          'Number of started client RPCs');
      globalStats.registerView(view5);

      const measurement = {measure, value: 22000};
      const measurement2 = {measure: measure2, value: 1100};
      const measurement3 = {measure: measure3, value: 1};
      const measurement4 = {measure: measure3, value: 2};
      const measurement5 = {measure: measure4, value: 2};

      globalStats.record(
          [measurement, measurement2, measurement3, measurement4, measurement5],
          tagMap);

      rpczData = await zpagesClient.getRpcz();
      const measures = rpczData.measuresSent['ExampleMethod'];
      assert.strictEqual(measures.count.tot, 2);
      assert.strictEqual(measures.avgLatency.tot.toFixed(3), '1.500');
      assert.strictEqual(measures.input.tot.toFixed(3), '1.074');
      assert.strictEqual(measures.output.tot.toFixed(3), '21.484');
      assert.strictEqual(measures.errors.tot, 2);
    });

    it('should get the received stats', async () => {
      const GRPC_SERVER_METHOD = {name: 'grpc_server_method'};
      const GRPC_SERVER_STATUS = {name: 'grpc_server_status'};
      const GRPC_SERVER_METHOD_V = {value: 'ExampleMethod'};
      const GRPC_SERVER_STATUS_V = {value: 'DEADLINE_EXCEEDED'};
      const tagMap = new TagMap();
      tagMap.set(GRPC_SERVER_METHOD, GRPC_SERVER_METHOD_V);
      tagMap.set(GRPC_SERVER_STATUS, GRPC_SERVER_STATUS_V);
      const boundaries = [10, 20, 30, 40];

      const measure5 = globalStats.createMeasureDouble(
          'grpc.io/server/received_bytes_per_rpc', MeasureUnit.BYTE,
          'Total bytes sent across all request messages per RPC');

      const measure6 = globalStats.createMeasureDouble(
          'grpc.io/server/sent_bytes_per_rpc', MeasureUnit.BYTE,
          'Total bytes received across all request messages per RPC');

      const measure7 = globalStats.createMeasureDouble(
          'grpc.io/server/server_latency', MeasureUnit.MS,
          'Time between first byte of request sent to last byte of response received or terminal error');

      const measure8 = globalStats.createMeasureDouble(
          'grpc.io/server/started_rpcs', MeasureUnit.UNIT,
          'Number of started client RPCs.');

      const view1 = globalStats.createView(
          'grpc.io/server/received_bytes_per_rpc', measure5,
          AggregationType.DISTRIBUTION,
          [GRPC_SERVER_METHOD, GRPC_SERVER_STATUS], 'Sent bytes per RPC',
          boundaries);
      globalStats.registerView(view1);

      const view2 = globalStats.createView(
          'grpc.io/server/sent_bytes_per_rpc', measure6,
          AggregationType.DISTRIBUTION,
          [GRPC_SERVER_METHOD, GRPC_SERVER_STATUS], 'Sent bytes per RPC',
          boundaries);
      globalStats.registerView(view2);

      const view3 = globalStats.createView(
          'grpc.io/server/server_latency', measure7,
          AggregationType.DISTRIBUTION,
          [GRPC_SERVER_METHOD, GRPC_SERVER_STATUS], 'Latency in msecs',
          boundaries);
      globalStats.registerView(view3);

      const view4 = globalStats.createView(
          'grpc.io/server/completed_rpcs', measure7, AggregationType.COUNT,
          [GRPC_SERVER_METHOD, GRPC_SERVER_STATUS],
          'Number of completed client RPCs');
      globalStats.registerView(view4);

      const view5 = globalStats.createView(
          'grpc.io/server/started_rpcs', measure8, AggregationType.COUNT,
          [GRPC_SERVER_METHOD, GRPC_SERVER_STATUS],
          'Number of started client RPCs');
      globalStats.registerView(view5);

      const measurement6 = {measure: measure5, value: 2200};
      const measurement7 = {measure: measure6, value: 1100};
      const measurement8 = {measure: measure7, value: 1};
      const measurement9 = {measure: measure7, value: 2};
      const measurement10 = {measure: measure8, value: 2};

      globalStats.record(
          [
            measurement6, measurement7, measurement8, measurement9,
            measurement10
          ],
          tagMap);

      rpczData = await zpagesClient.getRpcz();
      const measures = rpczData.measuresReceived['ExampleMethod'];

      assert.strictEqual(measures.count.tot, 2);
      assert.strictEqual(measures.avgLatency.tot.toFixed(3), '1.500');
      assert.strictEqual(measures.input.tot.toFixed(3), '2.148');
      assert.strictEqual(measures.output.tot.toFixed(3), '1.074');
      assert.strictEqual(measures.errors.tot, 2);
    });
  });
});
