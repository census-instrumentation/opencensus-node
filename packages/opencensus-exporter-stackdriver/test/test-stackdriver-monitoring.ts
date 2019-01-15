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

import {LabelKey, Logger, MeasureUnit, Metrics, Stats} from '@opencensus/core';
import * as assert from 'assert';

import {StackdriverStatsExporter} from '../src/stackdriver-monitoring';
import {MetricKind, StackdriverExporterOptions, ValueType} from '../src/types';
import * as nocks from './nocks';

const PROJECT_ID = 'fake-project-id';

class MockLogger implements Logger {
  level: string;
  // tslint:disable-next-line:no-any
  debugBuffer: any[] = [];

  cleanAll() {
    this.debugBuffer = [];
  }

  // tslint:disable-next-line:no-any
  debug(message: string, ...args: any[]) {
    this.debugBuffer.push(...args);
  }

  // tslint:disable-next-line:no-any
  error(...args: any[]) {}
  // tslint:disable-next-line:no-any
  warn(...args: any[]) {}
  // tslint:disable-next-line:no-any
  info(...args: any[]) {}
}


describe('Stackdriver Stats Exporter', () => {
  // CircleCI pre-empts the VM
  const DELAY = 200;
  describe('test constants', () => {
    assert.strictEqual(
        StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN,
        'custom.googleapis.com/opencensus');
    assert.strictEqual(
        StackdriverStatsExporter.DEFAULT_DISPLAY_NAME_PREFIX, 'OpenCensus');
  });

  describe('Send data to Stackdriver', () => {
    const stats = new Stats();
    const mockLogger = new MockLogger();
    let exporterOptions: StackdriverExporterOptions;
    let exporter: StackdriverStatsExporter;

    before(() => {
      exporterOptions = {period: 0, projectId: PROJECT_ID, logger: mockLogger};
      exporter = new StackdriverStatsExporter(exporterOptions);

      nocks.oauth2();
    });

    afterEach(() => {
      exporter.close();
      mockLogger.cleanAll();
    });

    it('should not export for empty data', () => {
      stats.registerExporter(exporter);
      assert.equal(mockLogger.debugBuffer.length, 0);
    });

    it('should export the data', async () => {
      const METRIC_NAME = 'metric-name';
      const METRIC_DESCRIPTION = 'metric-description';
      const UNIT = MeasureUnit.UNIT;
      const LABEL_KEYS: LabelKey[] = [{key: 'code', description: 'desc'}];

      const metricRegistry = Metrics.getMetricRegistry();

      const gauge = metricRegistry.addInt64Gauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
      gauge.getDefaultTimeSeries().add(100);

      nocks.metricDescriptors(PROJECT_ID, null, null, false);
      nocks.timeSeries(PROJECT_ID, null, null, false);

      await exporter.export();
      assert.equal(mockLogger.debugBuffer.length, 1);
      const [metricDescriptor] = mockLogger.debugBuffer;
      assert.strictEqual(
          metricDescriptor.type,
          `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
              METRIC_NAME}`);
      assert.strictEqual(metricDescriptor.description, METRIC_DESCRIPTION);
      assert.strictEqual(
          metricDescriptor.displayName,
          `${StackdriverStatsExporter.DEFAULT_DISPLAY_NAME_PREFIX}/${
              METRIC_NAME}`);
      assert.strictEqual(metricDescriptor.metricKind, MetricKind.GAUGE);
      assert.strictEqual(metricDescriptor.valueType, ValueType.INT64);
      assert.strictEqual(metricDescriptor.unit, UNIT);
      assert.deepStrictEqual(metricDescriptor.labels, [
        {key: 'code', valueType: 'STRING', description: 'desc'}, {
          key: 'opencensus_task',
          valueType: 'STRING',
          description: 'Opencensus task identifier'
        }
      ]);

      await new Promise((resolve) => setTimeout(resolve, DELAY)).then(() => {
        const timeSeries = mockLogger.debugBuffer[1][0];
        assert.strictEqual(
            timeSeries.metric.type,
            `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                METRIC_NAME}`);
        assert.strictEqual(timeSeries.resource.type, 'global');
        assert.ok(timeSeries.resource.labels.project_id);
        assert.strictEqual(timeSeries.resource.labels.project_id, PROJECT_ID);
        assert.strictEqual(timeSeries.metricKind, MetricKind.GAUGE);
        assert.strictEqual(timeSeries.valueType, ValueType.INT64);
        assert.ok(timeSeries.points.length > 0);
        assert.deepStrictEqual(timeSeries.points[0].value.int64Value, 100);
      });
    });
  });
});
