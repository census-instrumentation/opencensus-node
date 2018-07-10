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

import {AggregationType, logger, Measure, MeasureUnit, Stats, View} from '@opencensus/core';
import * as assert from 'assert';
import * as fs from 'fs';
import * as mocha from 'mocha';
import * as nock from 'nock';

import {StackdriverExporterOptions, StackdriverStatsExporter} from '../src/';
import {LabelDescriptor, MetricDescriptor, MetricKind, TimeSeries, ValueType} from '../src/types';

import * as nocks from './nocks';

process.env.UV_THREADPOOL_SIZE = '10';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
let PROJECT_ID = 'fake-project-id';

/**
 * Asserts MetricDescriptors' values given its originating view.
 * @param metricDescriptor The MetricDescriptor to be asserted.
 * @param view The originating view.
 */
function assertMetricDescriptor(
    metricDescriptor: MetricDescriptor, view: View) {
  let metricKind: MetricKind;
  if (view.aggregation === AggregationType.sum) {
    metricKind = MetricKind.CUMULATIVE;
  } else {
    metricKind = MetricKind.GAUGE;
  }

  let valueType: ValueType;
  if (view.measure.type === 'DOUBLE') {
    valueType = ValueType.DOUBLE;
  } else if (view.aggregation === AggregationType.distribution) {
    valueType = ValueType.DISTRIBUTION;
  } else {
    valueType = ValueType.INT64;
  }

  assert.strictEqual(
      metricDescriptor.type, `custom.googleapis.com/${view.name}`);
  assert.strictEqual(metricDescriptor.description, view.description);
  assert.strictEqual(metricDescriptor.displayName, view.measure.name);
  assert.strictEqual(metricDescriptor.metricKind, metricKind);
  assert.strictEqual(metricDescriptor.valueType, valueType);
  assert.strictEqual(metricDescriptor.unit, view.measure.unit);
}

/**
 * Asserts TimeSeries' values given its originating view.
 * @param TimeSeries The TimeSeries to be asserted.
 * @param view The originating view.
 * @param projectId The project ID from the Stackdriver Monitoring.
 */
function assertTimeSeries(
    timeSeries: TimeSeries[], view: View, projectId: string) {
  const resourceLabels: {[key: string]: string} = {project_id: projectId};

  let metricKind: MetricKind;
  if (view.aggregation === AggregationType.sum) {
    metricKind = MetricKind.CUMULATIVE;
  } else {
    metricKind = MetricKind.GAUGE;
  }

  let valueType: ValueType;
  if (view.measure.type === 'DOUBLE') {
    valueType = ValueType.DOUBLE;
  } else if (view.aggregation === AggregationType.distribution) {
    valueType = ValueType.DISTRIBUTION;
  } else {
    valueType = ValueType.INT64;
  }

  for (let i = 0; i < view.getSnapshotValues().length; i++) {
    const metricValue = view.getSnapshotValues()[i];
    assert.strictEqual(
        timeSeries[i].metric.type, `custom.googleapis.com/${view.name}`);
    assert.deepEqual(timeSeries[i].metric.labels, metricValue.tags);
    assert.strictEqual(timeSeries[i].resource.type, 'global');
    assert.ok(timeSeries[i].resource.labels.project_id);
    assert.strictEqual(
        timeSeries[i].resource.labels.project_id, resourceLabels.project_id);
    assert.strictEqual(timeSeries[i].metricKind, metricKind);
    assert.strictEqual(timeSeries[i].valueType, valueType);
    assert.ok(timeSeries[i].points.length > 0);
  }
}

describe('Stackdriver Stats Exporter', function() {
  this.timeout(0);

  const testLogger = logger.logger();
  let dryrun = true;
  const GOOGLE_APPLICATION_CREDENTIALS: string =
      process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const OPENCENSUS_NETWORK_TESTS: string = process.env.OPENCENSUS_NETWORK_TESTS;

  let exporterOptions: StackdriverExporterOptions;
  let exporter: StackdriverStatsExporter;
  const stats = new Stats();
  let oauth2Scope: nock.Scope;

  const labelKeys = ['key1', 'key2'];
  const labelValues = ['value1', 'value2'];
  const measureInt64 = stats.createMeasureInt64(
      'opencensus.io/test/int64', 'description', MeasureUnit.unit);
  const measureDouble = stats.createMeasureDouble(
      'opencensus.io/test/double', 'description', MeasureUnit.unit);

  const testViews = [
    stats.createLastValueView(
        measureDouble, labelKeys, 'test/metricKindGauge', 'Metric Kind Gauge'),
    stats.createSumView(
        measureDouble, labelKeys, 'test/MetricKindCumulaive',
        'Metric Kind Cumulative'),
    stats.createSumView(
        measureInt64, labelKeys, 'test/ValueTypeInt64', 'Value Type Int64'),
    stats.createSumView(
        measureDouble, labelKeys, 'test/ValueTypeDouble', 'Value Type Double'),
  ];

  before(() => {
    if (GOOGLE_APPLICATION_CREDENTIALS) {
      dryrun = !fs.existsSync(GOOGLE_APPLICATION_CREDENTIALS) &&
          !fs.existsSync(OPENCENSUS_NETWORK_TESTS);
      if (!dryrun) {
        const credentials = require(GOOGLE_APPLICATION_CREDENTIALS);
        PROJECT_ID = credentials.project_id;
        testLogger.debug(
            'GOOGLE_APPLICATION_CREDENTIALS: %s',
            GOOGLE_APPLICATION_CREDENTIALS);
        testLogger.debug('projectId = %s', PROJECT_ID);
      }
    }
    exporterOptions = {projectId: PROJECT_ID};
    exporter = new StackdriverStatsExporter(exporterOptions);
    if (dryrun) {
      nock.disableNetConnect();
      oauth2Scope = nocks.oauth2();
    }
    testLogger.debug('dryrun=%s', dryrun);
  });

  /* Should create a Stackdriver Metric Descriptor */
  describe('Create Stackdriver Metric Descriptors', () => {
    testViews.map((view, i) => {
      it(`Should create a ${view.description} Metric Descriptor`, async () => {
        if (dryrun) {
          nocks.metricDescriptors(PROJECT_ID, null, null, false);
        }
        await exporter.onRegisterView(view).then((result: MetricDescriptor) => {
          return assertMetricDescriptor(result, view);
        });
      });
    });
  });

  /* Should create a Stackdriver Time Series */
  describe('Create Stackdriver Time Series', () => {
    testViews.map((view, i) => {
      if (dryrun) {
        nocks.timeSeries(PROJECT_ID, null, null, false);
      }
      it(`Should create a ${view.description} Time Series`, async () => {
        await exporter.onRegisterView(view).then(async () => {
          view.metric.labelValues(labelValues).record(100);

          await exporter.onRecord(view).then((result: TimeSeries[]) => {
            return assertTimeSeries(result, view, PROJECT_ID);
          });
        });
      });
    });
  });

  /**
   * Should send a Stackdriver Metric Descriptor and Time Series to Stackdriver.
   */
  describe('Send data to Stackdriver', () => {
    const testViewMetric = stats.createLastValueView(
        measureDouble, labelKeys, 'test/metricDescriptorSend',
        'Metric Descriptor Send');
    const testViewTimeSeries = stats.createLastValueView(
        measureDouble, labelKeys, 'test/timeSeriesSend', 'Time Series Send');
    const measurement = {measure: measureDouble, value: 100};

    describe('With valid projectId', () => {
      it(`.onRegisterView() Should be successfull`, async () => {
        if (dryrun) {
          nocks.metricDescriptors(PROJECT_ID, null, null, false);
        }
        await exporter.onRegisterView(testViewMetric)
            .then((result: MetricDescriptor) => {
              return assertMetricDescriptor(result, testViewMetric);
            });
      });

      it(`.onRecord() Should be successfull`, async () => {
        if (dryrun) {
          nocks.timeSeries(PROJECT_ID, null, null, false);
        }

        testViewMetric.metric.labelValues(labelValues).record(100);

        await exporter.onRecord(testViewMetric).then((result: TimeSeries[]) => {
          return assertTimeSeries(result, testViewMetric, PROJECT_ID);
        });
      });
    });

    describe('With wrong projectId', () => {
      const WRONG_PROJECT_ID = 'wrong-project-id';
      if (dryrun) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS =
            __dirname + '/fixtures/fakecredentials.json';
        nocks.metricDescriptors(WRONG_PROJECT_ID, null, null, false);
      }

      const failExporterOptions = {
        projectId: WRONG_PROJECT_ID,
        logger: logger.logger('debug')
      };
      const failExporter = new StackdriverStatsExporter(failExporterOptions);

      it('.onRegisterView() Should fail by wrong projectId', async () => {
        await failExporter.onRegisterView(testViewMetric)
            .catch((err: Error) => {
              assert.ok(err.message.indexOf('Permission denied') >= 0);
            });
      });

      it('.onRecord() Should fail by wrong projectId', async () => {
        testViewMetric.metric.labelValues(labelValues).record(100);

        await exporter.onRecord(testViewMetric).catch((err: Error) => {
          assert.ok(err.message.indexOf('Permission denied') >= 0);
        });
      });
    });

    describe('With no network connection', () => {
      it('.onRegisterView() Should fail by network error', async () => {
        nock('https://monitoring.googleapis.com')
            .persist()
            .intercept(
                '/v3/projects/' + PROJECT_ID + '/metricDescriptors', 'POST')
            .reply(443, 'Simulated Network Error');
        await exporter.onRegisterView(testViewMetric).catch((err: Error) => {
          assert.ok(err.message.indexOf('Simulated Network Error') >= 0);
        });
      });

      it('.onRecord() Should fail by network error', async () => {
        nock('https://monitoring.googleapis.com')
            .persist()
            .intercept('/v3/projects/' + PROJECT_ID + '/timeSeries', 'POST')
            .reply(443, 'Simulated Network Error');
        testViewMetric.metric.labelValues(labelValues).record(100);

        await exporter.onRecord(testViewMetric).catch((err: Error) => {
          assert.ok(err.message.indexOf('Simulated Network Error') >= 0);
        });
      });
    });
  });
});