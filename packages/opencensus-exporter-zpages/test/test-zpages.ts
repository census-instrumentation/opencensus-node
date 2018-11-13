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

import {AggregationType, CountData, DistributionData, Measure, Measurement, MeasureUnit, RootSpan, Stats, SumData, Tags, TracerConfig} from '@opencensus/core';
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
    const tags: Tags = {tagKey1: 'tagValue1', tagKey2: 'tagValue1'};
    const tagKeys = Object.keys(tags);
    const tagValues = Object.keys(tags).map((tagKey) => {
      return tags[tagKey];
    });
    let zpages: ZpagesExporter;
    let stats: Stats;
    let measure: Measure;
    let zpagesData: StatsViewData;
    let measurement: Measurement;
    let measurement2: Measurement;

    beforeEach((done) => {
      stats = new Stats();
      zpages = new ZpagesExporter(options);
      stats.registerExporter(zpages);
      measure = stats.createMeasureDouble(
          'testMeasureDouble', MeasureUnit.UNIT, 'A test measure');
      measurement = {measure, tags, value: 22};
      measurement2 = {measure, tags, value: 11};
      zpages.startServer(done);
    });

    afterEach((done) => {
      zpages.stopServer(done);
    });

    describe('with COUNT aggregation type', () => {
      it('should get view information', async () => {
        stats.createView(
            'test/CountView', measure, AggregationType.COUNT, tagKeys,
            'A count test', null);
        stats.record(measurement, measurement2);

        zpagesData = await zpagesClient.getStatsz({path: 'test/CountView'});

        assert.equal(zpagesData.view.name, 'test/CountView');
        assert.equal(zpagesData.view.description, 'A count test');
        assert.equal(zpagesData.view.measure.name, 'testMeasureDouble');
        assert.equal(zpagesData.view.aggregation, AggregationType.COUNT);
      });

      it('should get stats for view', async () => {
        stats.createView(
            'test/CountView', measure, AggregationType.COUNT, tagKeys,
            'A count test', null);
        stats.record(measurement, measurement2);

        zpagesData = await zpagesClient.getStatsz({path: 'test/CountView'});

        const data = zpagesData.statsData[0];
        const snapshot = data.snapshot as CountData;
        assert.equal(data.tagKeys[0], tagKeys[0]);
        assert.equal(data.tagKeys[1], tagKeys[1]);
        assert.equal(data.tagValues[0], tagValues[0]);
        assert.equal(data.tagValues[1], tagValues[1]);
        assert.equal(snapshot.value, 2);
      });
    });

    describe('with SUM aggregation type', () => {
      it('should get view information', async () => {
        stats.registerExporter(zpages);
        stats.createView(
            'test/SumView', measure, AggregationType.SUM, tagKeys, 'A sum test',
            null);
        stats.record(measurement, measurement2);

        zpagesData = await zpagesClient.getStatsz({path: 'test/SumView'});

        assert.equal(zpagesData.view.name, 'test/SumView');
        assert.equal(zpagesData.view.description, 'A sum test');
        assert.equal(zpagesData.view.measure.name, 'testMeasureDouble');
        assert.equal(zpagesData.view.aggregation, AggregationType.SUM);
      });

      it('should get stats for view', async () => {
        stats.registerExporter(zpages);
        stats.createView(
            'test/SumView', measure, AggregationType.SUM, tagKeys, 'A sum test',
            null);

        stats.record(measurement, measurement2);

        zpagesData = await zpagesClient.getStatsz({path: 'test/SumView'});

        const data = zpagesData.statsData[0];
        const snapshot = data.snapshot as SumData;
        assert.equal(data.tagKeys[0], tagKeys[0]);
        assert.equal(data.tagKeys[1], tagKeys[1]);
        assert.equal(data.tagValues[0], tagValues[0]);
        assert.equal(data.tagValues[1], tagValues[1]);
        assert.equal(snapshot.value, 33);
      });
    });

    describe('with LAST VALUE aggregation type', () => {
      it('should get view information', async () => {
        stats.registerExporter(zpages);
        stats.createView(
            'test/LastValueView', measure, AggregationType.LAST_VALUE, tagKeys,
            'A last value test', null);
        stats.record(measurement, measurement2);

        zpagesData = await zpagesClient.getStatsz({path: 'test/LastValueView'});

        assert.equal(zpagesData.view.name, 'test/LastValueView');
        assert.equal(zpagesData.view.description, 'A last value test');
        assert.equal(zpagesData.view.measure.name, 'testMeasureDouble');
        assert.equal(zpagesData.view.aggregation, AggregationType.LAST_VALUE);
      });

      it('should get stats for view', async () => {
        stats.registerExporter(zpages);
        stats.createView(
            'test/LastValueView', measure, AggregationType.LAST_VALUE, tagKeys,
            'A last value test', null);

        stats.record(measurement, measurement2);

        zpagesData = await zpagesClient.getStatsz({path: 'test/LastValueView'});

        const data = zpagesData.statsData[0];
        const snapshot = data.snapshot as SumData;
        assert.equal(data.tagKeys[0], tagKeys[0]);
        assert.equal(data.tagKeys[1], tagKeys[1]);
        assert.equal(data.tagValues[0], tagValues[0]);
        assert.equal(data.tagValues[1], tagValues[1]);
        assert.equal(snapshot.value, 11);
      });
    });

    describe('with DISTRIBUTION aggregation type', () => {
      it('should get view information', async () => {
        const boundaries = [10, 20, 30, 40];
        stats.registerExporter(zpages);
        stats.createView(
            'test/DistributionView', measure, AggregationType.DISTRIBUTION,
            tagKeys, 'A distribution test', boundaries);
        stats.record(measurement, measurement2);

        zpagesData =
            await zpagesClient.getStatsz({path: 'test/DistributionView'});

        assert.equal(zpagesData.view.name, 'test/DistributionView');
        assert.equal(zpagesData.view.description, 'A distribution test');
        assert.equal(zpagesData.view.measure.name, 'testMeasureDouble');
        assert.equal(zpagesData.view.aggregation, AggregationType.DISTRIBUTION);
      });

      it('should get stats for view', async () => {
        const boundaries = [10, 20, 30, 40];
        stats.registerExporter(zpages);
        stats.createView(
            'test/DistributionView', measure, AggregationType.DISTRIBUTION,
            tagKeys, 'A distribution test', boundaries);

        stats.record(measurement, measurement2);

        zpagesData =
            await zpagesClient.getStatsz({path: 'test/DistributionView'});

        const data = zpagesData.statsData[0];
        const snapshot = data.snapshot as DistributionData;
        assert.equal(data.tagKeys[0], tagKeys[0]);
        assert.equal(data.tagKeys[1], tagKeys[1]);
        assert.equal(data.tagValues[0], tagValues[0]);
        assert.equal(data.tagValues[1], tagValues[1]);
        assert.equal(snapshot.count, 2);
        assert.equal(snapshot.max, 22);
        assert.equal(snapshot.min, 11);
        assert.equal(snapshot.mean, 16.5);
        assert.equal(snapshot.sumSquaredDeviations, 60.5);
      });
    });
  });

  describe('when a view is accessed in rpcz page', () => {
    let zpages: ZpagesExporter;
    let stats: Stats;
    let rpczData: RpczData;
    const boundaries = [10, 20, 30, 40];

    beforeEach((done) => {
      stats = new Stats();
      zpages = new ZpagesExporter(options);
      stats.registerExporter(zpages);
      zpages.startServer(done);
    });

    afterEach((done) => {
      zpages.stopServer(done);
    });

    it('should get the sent stats', async () => {
      const tags = {grpc_client_method: 'ExampleMethod'};
      const tags2 = {
        grpc_client_method: 'ExampleMethod',
        grpc_client_status: 'DEADLINE_EXCEEDED'
      };
      const tagKeys = Object.keys(tags);

      const measure = stats.createMeasureDouble(
          'grpc.io/client/sent_bytes_per_rpc', MeasureUnit.BYTE,
          'Total bytes sent across all request messages per RPC');

      const measure2 = stats.createMeasureDouble(
          'grpc.io/client/received_bytes_per_rpc', MeasureUnit.BYTE,
          'Total bytes received across all request messages per RPC');

      const measure3 = stats.createMeasureDouble(
          'grpc.io/client/roundtrip_latency', MeasureUnit.MS,
          'Time between first byte of request sent to last byte of response received or terminal error');

      const measure4 = stats.createMeasureDouble(
          'grpc.io/client/started_rpcs', MeasureUnit.UNIT,
          'Number of started client RPCs.');

      stats.createView(
          'grpc.io/client/sent_bytes_per_rpc', measure,
          AggregationType.DISTRIBUTION, tagKeys, 'Sent bytes per RPC',
          boundaries);

      stats.createView(
          'grpc.io/client/received_bytes_per_rpc', measure2,
          AggregationType.DISTRIBUTION, tagKeys, 'Sent bytes per RPC',
          boundaries);

      stats.createView(
          'grpc.io/client/roundtrip_latency', measure3,
          AggregationType.DISTRIBUTION, tagKeys, 'Latency in msecs',
          boundaries);

      stats.createView(
          'grpc.io/client/completed_rpcs', measure3, AggregationType.COUNT,
          tagKeys, 'Number of completed client RPCs', null);

      stats.createView(
          'grpc.io/client/started_rpcs', measure4, AggregationType.COUNT,
          tagKeys, 'Number of started client RPCs', null);

      const measurement = {measure, tags, value: 22000};
      const measurement2 = {measure: measure2, tags, value: 1100};
      const measurement3 = {measure: measure3, tags, value: 1};
      const measurement4 = {measure: measure3, tags: tags2, value: 2};
      const measurement5 = {measure: measure4, tags, value: 2};

      stats.record(
          measurement, measurement2, measurement3, measurement4, measurement5);

      rpczData = await zpagesClient.getRpcz();
      const measures = rpczData.measuresSent['ExampleMethod'];

      assert.equal(measures.count.tot, 2);
      assert.equal(measures.avgLatency.tot.toFixed(3), 2.000);
      assert.equal(measures.input.tot.toFixed(3), 1.074);
      assert.equal(measures.output.tot.toFixed(3), 21.484);
      assert.equal(measures.errors.tot, 1);
    });

    it('should get the received stats', async () => {
      const tags3 = {grpc_server_method: 'ExampleMethod'};
      const tags4 = {
        grpc_server_method: 'ExampleMethod',
        grpc_server_status: 'DEADLINE_EXCEEDED'
      };
      const tagKeys2 = Object.keys(tags3);
      const boundaries = [10, 20, 30, 40];

      const measure5 = stats.createMeasureDouble(
          'grpc.io/server/received_bytes_per_rpc', MeasureUnit.BYTE,
          'Total bytes sent across all request messages per RPC');

      const measure6 = stats.createMeasureDouble(
          'grpc.io/server/sent_bytes_per_rpc', MeasureUnit.BYTE,
          'Total bytes received across all request messages per RPC');

      const measure7 = stats.createMeasureDouble(
          'grpc.io/server/server_latency', MeasureUnit.MS,
          'Time between first byte of request sent to last byte of response received or terminal error');

      const measure8 = stats.createMeasureDouble(
          'grpc.io/server/started_rpcs', MeasureUnit.UNIT,
          'Number of started client RPCs.');

      stats.createView(
          'grpc.io/server/received_bytes_per_rpc', measure5,
          AggregationType.DISTRIBUTION, tagKeys2, 'Sent bytes per RPC',
          boundaries);

      stats.createView(
          'grpc.io/server/sent_bytes_per_rpc', measure6,
          AggregationType.DISTRIBUTION, tagKeys2, 'Sent bytes per RPC',
          boundaries);

      stats.createView(
          'grpc.io/server/server_latency', measure7,
          AggregationType.DISTRIBUTION, tagKeys2, 'Latency in msecs',
          boundaries);

      stats.createView(
          'grpc.io/server/completed_rpcs', measure7, AggregationType.COUNT,
          tagKeys2, 'Number of completed client RPCs', null);

      stats.createView(
          'grpc.io/server/started_rpcs', measure8, AggregationType.COUNT,
          tagKeys2, 'Number of started client RPCs', null);

      const measurement6 = {measure: measure5, tags: tags3, value: 2200};
      const measurement7 = {measure: measure6, tags: tags3, value: 1100};
      const measurement8 = {measure: measure7, tags: tags3, value: 1};
      const measurement9 = {measure: measure7, tags: tags4, value: 2};
      const measurement10 = {measure: measure8, tags: tags3, value: 2};

      stats.record(
          measurement6, measurement7, measurement8, measurement9,
          measurement10);

      rpczData = await zpagesClient.getRpcz();
      const measures = rpczData.measuresReceived['ExampleMethod'];

      assert.equal(measures.count.tot, 2);
      assert.equal(measures.avgLatency.tot.toFixed(3), 2.000);
      assert.equal(measures.input.tot.toFixed(3), 2.148);
      assert.equal(measures.output.tot.toFixed(3), 1.074);
      assert.equal(measures.errors.tot, 1);
    });
  });
});
