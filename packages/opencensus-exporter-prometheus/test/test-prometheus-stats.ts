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

import {AggregationType, CounterMetric, Distribution, GaugeMetric, HistogramMetric, logger, Measure, Measurement, MeasureUnit, MetricValuesTypes, SingleValue, Stats, Tags, View} from '@opencensus/core';
import {StatsExporter} from '@opencensus/core';
import * as assert from 'assert';
import axios from 'axios';
import * as fs from 'fs';
import * as mocha from 'mocha';

import {PrometheusExporterOptions, PrometheusStatsExporter} from '../src/';


/**
 * A class that acts as a Prometheus Server to scrap the metric pages
 */
class PrometheusFakeScraper {
  constructor(private readonly origin: string) {}

  private async getEndpoint<R>(endpoint: string): Promise<R> {
    const response = await axios.get(`${this.origin}/${endpoint}`);
    return response.data as R;
  }

  /**
   * Gets the data model backing the tracez UI.
   * @param query Optional query parameters.
   */
  async getMetric(): Promise<string> {
    return this.getEndpoint<string>('metrics');
  }
}

const options = {
  port: 9464,
  startServer: false
} as PrometheusExporterOptions;

function normalizeNameForPrometheus(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

describe('PrometheusStats Exporter', () => {
  const prometeusServer =
      new PrometheusFakeScraper(`http://localhost:${options.port}`);
  let stats: Stats;
  let measure: Measure;
  let view: View;
  let exporter: PrometheusStatsExporter;
  let columns: string[] = [];
  let defaultBucket: number[] = [];

  beforeEach(() => {
    measure = stats.createMeasureInt64(
        'opencensus.io/stats/size', 'description', MeasureUnit.byte);
  });


  describe('When there is no view registered', () => {
    before((done) => {
      exporter = new PrometheusStatsExporter(options);
      exporter.startServer(done);
      stats = new Stats();
      stats.registerExporter(exporter);
    });

    after((done) => {
      exporter.stopServer(done);
    });

    it('should return a blank page', async () => {
      assert.strictEqual(exporter.getViewList().length, 0);
      const metricPage = await prometeusServer.getMetric();
      assert.strictEqual(metricPage, '');
    });
  });

  describe('Exporting a counter view', () => {
    before((done) => {
      stats = new Stats();
      exporter = new PrometheusStatsExporter(options);
      exporter.startServer(done);
      stats.registerExporter(exporter);
      view = stats.createCountView(measure, columns);
      stats.registerView(view);
    });

    after((done) => {
      exporter.stopServer(done);
      stats.clearRegister();
    });

    it('should return a blank page if there is no value record on the view',
       async () => {
         assert.strictEqual(exporter.getViewList().length, 1);
         const metricPage = await prometeusServer.getMetric();
         assert.strictEqual(metricPage, '');
       });

    it('should return page if there is no value record on the view',
       async () => {
         view.recordValue();
         assert.strictEqual(exporter.getViewList().length, 1);
         const metricPage = await prometeusServer.getMetric();

         checkPrometheusPage(metricPage, view);
       });
  });

  describe('Exporting a LastValue view', () => {
    before((done) => {
      stats = new Stats();
      exporter = new PrometheusStatsExporter(options);
      exporter.startServer(done);
      stats.registerExporter(exporter);
      view = stats.createLastValueView(measure, columns);
      stats.registerView(view);
    });

    after((done) => {
      exporter.stopServer(done);
      stats.clearRegister();
      columns = [];
    });

    it('should return a blank page if there is no value record on the view',
       async () => {
         assert.strictEqual(exporter.getViewList().length, 1);
         const metricPage = await prometeusServer.getMetric();
         assert.strictEqual(metricPage, '');
       });

    it('should return page if there is no value record on the view',
       async () => {
         view.recordValue([], 5);
         assert.strictEqual(exporter.getViewList().length, 1);
         const metricPage = await prometeusServer.getMetric();
         checkPrometheusPage(metricPage, view);
       });
  });

  describe('Exporting a Sum view', () => {
    before((done) => {
      stats = new Stats();
      exporter = new PrometheusStatsExporter(options);
      exporter.startServer(done);
      stats.registerExporter(exporter);
      columns = ['method', 'status'];

      view = stats.createSumView(measure, columns);
      stats.registerView(view);
    });

    after((done) => {
      exporter.stopServer(done);
      stats.clearRegister();
    });

    it('should return a blank page if there is no value record on the view',
       async () => {
         assert.strictEqual(exporter.getViewList().length, 1);
         const metricPage = await prometeusServer.getMetric();
         assert.strictEqual(metricPage, '');
       });

    it('should return page if there is no value record on the view',
       async () => {
         view.recordValue(['GET', '200'], 5);
         assert.strictEqual(exporter.getViewList().length, 1);
         const metricPage = await prometeusServer.getMetric();
         checkPrometheusPage(metricPage, view);
       });
  });

  describe('Exporting a Distribution view', () => {
    before((done) => {
      stats = new Stats();
      exporter = new PrometheusStatsExporter(options);
      exporter.startServer(done);
      stats.registerExporter(exporter);
      columns = ['method', 'status'];
      defaultBucket = [10, 20, 30, 40, 50, 60, 70, 90, 100];

      view = stats.createDistribuitionView(measure, defaultBucket, columns);
      stats.registerView(view);
    });

    after((done) => {
      exporter.stopServer(done);
      stats.clearRegister();
    });

    it('should return a blank page if there is no value record on the view',
       async () => {
         assert.strictEqual(exporter.getViewList().length, 1);
         const metricPage = await prometeusServer.getMetric();
         assert.strictEqual(metricPage, '');
       });

    it('should return page if there is no value record on the view',
       async () => {
         defaultBucket.forEach(
             value => view.recordValue(['GET', '200'], value));
         assert.strictEqual(exporter.getViewList().length, 1);
         const metricPage = await prometeusServer.getMetric();
         checkPrometheusPage(metricPage, view);
       });
  });
});


function checkPrometheusPage(metricPage: string, view: View) {
  const lines = metricPage.split('\n');

  assert.ok(lines[0].startsWith('# HELP'));
  assert.ok(lines[0].indexOf(normalizeNameForPrometheus(view.name)) >= 0);
  assert.ok(
      lines[0].indexOf(normalizeNameForPrometheus(view.description)) >= 0);
  assert.ok(lines[1].startsWith('# TYPE'));
  assert.ok(lines[1].indexOf(normalizeNameForPrometheus(view.name)) >= 0);
  assert.ok(
      lines[1].indexOf(normalizeNameForPrometheus(view.metric.type)) >= 0);

  if (view.aggregation !== AggregationType.distribution) {
    assert.strictEqual(lines.length, 4);
    assert.ok(lines[2].indexOf(normalizeNameForPrometheus(view.name)) >= 0);
    if (view.columns && view.columns.length > 0) {
      assert.ok(lines[2].indexOf('{') >= 0);
      view.columns.forEach((name) => assert.ok(lines[2].indexOf(name) >= 0));
      assert.ok(lines[2].indexOf('}') >= 0);
    } else {
      assert.ok(lines[2].indexOf('{') < 0);
    }
    assert.strictEqual(lines[3], '');
  } else {
    const value = view.getSnapshotValues() as Distribution[];
    const distribution = value[0];
    // +2(for header), +bucket.length, +1(le: +inf),  +1(sum) , +1(count),
    // +1(linebreak)
    const totalLines =
        2 + distribution.boundaries.bucketBoundaries.length + 3 + 1;
    const boundaries = distribution.boundaries.bucketBoundaries;
    assert.strictEqual(lines.length, totalLines);
    for (let i = 2; i < distribution.boundaries.bucketBoundaries.length + 2;
         i++) {
      assert.ok(lines[i].indexOf(normalizeNameForPrometheus(view.name)) >= 0);
      assert.ok(lines[i].indexOf(`{le=\"${boundaries[i - 2]}\"`) >= 0);
    }
    assert.ok(lines[totalLines - 4].indexOf('{le=\"+Inf\"') >= 0);
    assert.ok(lines[totalLines - 3].indexOf('_sum') >= 0);
    assert.ok(lines[totalLines - 2].indexOf('_count') >= 0);
  }
}
