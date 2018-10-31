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

import {AggregationType, BaseView, logger, Logger, Measure, Measurement, MeasureType, MeasureUnit, Stats, View} from '@opencensus/core';
import * as assert from 'assert';
import * as fs from 'fs';
import * as mocha from 'mocha';
import * as nock from 'nock';
import * as path from 'path';

import {StackdriverStatsExporter} from '../src/stackdriver-monitoring';
import {LabelDescriptor, MetricDescriptor, MetricKind, StackdriverExporterOptions, TimeSeries, ValueType} from '../src/types';

import * as nocks from './nocks';

let PROJECT_ID = 'fake-project-id';

class ExporterTestLogger implements Logger {
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
  // tslint:disable-next-line:no-any
  silly(...args: any[]) {}
}

/**
 * Asserts MetricDescriptors' values given its originating view.
 * @param metricDescriptor The MetricDescriptor to be asserted.
 * @param view The originating view.
 * @param prefix Optional metric prefix.
 */
function assertMetricDescriptor(
    metricDescriptor: MetricDescriptor, view: View,
    prefix: string = StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN) {
  let metricKind: MetricKind;
  if (view.aggregation === AggregationType.SUM) {
    metricKind = MetricKind.CUMULATIVE;
  } else {
    metricKind = MetricKind.GAUGE;
  }

  let valueType: ValueType;
  if (view.measure.type === MeasureType.DOUBLE) {
    valueType = ValueType.DOUBLE;
  } else if (view.aggregation === AggregationType.DISTRIBUTION) {
    valueType = ValueType.DISTRIBUTION;
  } else {
    valueType = ValueType.INT64;
  }

  assert.strictEqual(metricDescriptor.type, `${prefix}/${view.name}`);
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
 * @param measurement The originating measurement.
 * @param projectId The project ID from the Stackdriver Monitoring.
 */
function assertTimeSeries(
    timeSeries: TimeSeries, view: View, measurement: Measurement,
    projectId: string,
    prefix: string = StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN) {
  const resourceLabels: {[key: string]: string} = {project_id: projectId};

  let metricKind: MetricKind;
  if (view.aggregation !== AggregationType.LAST_VALUE) {
    metricKind = MetricKind.CUMULATIVE;
  } else {
    metricKind = MetricKind.GAUGE;
  }

  let valueType: ValueType;
  if (view.measure.type === MeasureType.DOUBLE) {
    valueType = ValueType.DOUBLE;
  } else if (view.aggregation === AggregationType.DISTRIBUTION) {
    valueType = ValueType.DISTRIBUTION;
  } else {
    valueType = ValueType.INT64;
  }

  assert.strictEqual(timeSeries.metric.type, `${prefix}/${view.name}`);
  assert.deepEqual(timeSeries.metric.labels, measurement.tags);
  assert.strictEqual(timeSeries.resource.type, 'global');
  assert.ok(timeSeries.resource.labels.project_id);
  assert.strictEqual(
      timeSeries.resource.labels.project_id, resourceLabels.project_id);
  assert.strictEqual(timeSeries.metricKind, metricKind);
  assert.strictEqual(timeSeries.valueType, valueType);
  assert.ok(timeSeries.points.length > 0);
}

describe('Stackdriver Stats Exporter', function() {
  this.timeout(0);

  const testLogger = logger.logger();
  let dryrun = true;
  const GOOGLE_APPLICATION_CREDENTIALS: string =
      process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const OPENCENSUS_NETWORK_TESTS: string = process.env.OPENCENSUS_NETWORK_TESTS;

  const exporterTestLogger = new ExporterTestLogger();
  let exporterOptions: StackdriverExporterOptions;
  let exporter: StackdriverStatsExporter;
  const stats = new Stats();

  const tags = {tagKey1: 'valueKey1'};
  const tagKeys = Object.keys(tags);
  const measureInt64 = stats.createMeasureInt64(
      'opencensus.io/test/int64', MeasureUnit.UNIT, 'Measure Int64');
  const measureDouble = stats.createMeasureDouble(
      'opencensus.io/test/double', MeasureUnit.UNIT, 'Measure Double');

  const testViews = [
    new BaseView(
        'test/metricKindGauge', measureDouble, AggregationType.LAST_VALUE,
        tagKeys, 'Metric Kind Gauge'),
    new BaseView(
        'test/metricKindCumulative', measureDouble, AggregationType.SUM,
        tagKeys, 'Metric Kind Cumulative'),
    new BaseView(
        'test/valueTypeInt64', measureInt64, AggregationType.SUM, tagKeys,
        'ValueTypeInt64'),
    new BaseView(
        'test/valueTypeDouble', measureDouble, AggregationType.SUM, tagKeys,
        'Value Type Double')
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

    exporterOptions = {
      period: 0,
      projectId: PROJECT_ID,
      logger: exporterTestLogger
    };
    exporter = new StackdriverStatsExporter(exporterOptions);
    stats.registerExporter(exporter);

    if (dryrun) {
      nocks.oauth2();
    }
    testLogger.debug('dryrun=%s', dryrun);
  });

  after(() => {
    exporter.close();
  });

  afterEach(() => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_APPLICATION_CREDENTIALS;
    exporterTestLogger.cleanAll();
  });

  /* Should create a Stackdriver Metric Descriptor */
  describe('Create Stackdriver Metric Descriptors', () => {
    testViews.map((view) => {
      it(`Should create a ${view.description} Metric Descriptor`, async () => {
        if (dryrun) {
          nocks.metricDescriptors(PROJECT_ID, null, null, false);
        }
        await exporter.onRegisterView(view).then(() => {
          return assertMetricDescriptor(
              exporterTestLogger.debugBuffer[0], view);
        });
      });
    });
  });

  /* Should create a Stackdriver Time Series */
  describe('Create Stackdriver Time Series', () => {
    testViews.map((view) => {
      if (dryrun) {
        nocks.metricDescriptors(PROJECT_ID, null, null, false);
        nocks.timeSeries(PROJECT_ID, null, null, false);
      }
      it(`Should create a ${view.description} Time Series`, async () => {
        await exporter.onRegisterView(view).then(async () => {
          const measurement:
              Measurement = {measure: view.measure, value: 1, tags};
          view.recordMeasurement(measurement);

          exporter.onRecord([view], measurement);

          await new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
            return assertTimeSeries(
                exporterTestLogger.debugBuffer[1][0], view, measurement,
                PROJECT_ID);
          });
        });
      });
    });
  });

  /**
   * Should send a Stackdriver Metric Descriptor and Time Series to Stackdriver.
   */
  describe('Send data to Stackdriver', () => {
    const viewMetricDescriptor = new BaseView(
        'test/metricDscriptorSend', measureDouble, AggregationType.LAST_VALUE,
        tagKeys, 'Metric Descriptor Send');
    const viewTimeSeries = new BaseView(
        'test/timeSeriesSend', measureDouble, AggregationType.LAST_VALUE,
        tagKeys, 'Time Series Send');
    const measurement = {measure: measureDouble, value: 100, tags};

    describe('With valid projectId', () => {
      it(`.onRegisterView() should be successfull`, async () => {
        if (dryrun) {
          nocks.metricDescriptors(PROJECT_ID, null, null, false);
        }
        await exporter.onRegisterView(viewMetricDescriptor).then(() => {
          return assertMetricDescriptor(
              exporterTestLogger.debugBuffer[0], viewMetricDescriptor);
        });
      });

      it(`.onRecord() Should be successfull`, async () => {
        if (dryrun) {
          nocks.timeSeries(PROJECT_ID, null, null, false);
        }

        viewTimeSeries.recordMeasurement(measurement);

        exporter.onRecord([viewTimeSeries], measurement);

        await new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
          return assertTimeSeries(
              exporterTestLogger.debugBuffer[0][0], viewTimeSeries, measurement,
              PROJECT_ID);
        });
      });
    });

    describe('With wrong projectId', () => {
      const WRONG_PROJECT_ID = 'wrong-project-id';
      if (dryrun) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS =
            __dirname + '/fixtures/fakecredentials.json';
      }

      it('.onRegisterView() Should fail by wrong projectId', (done) => {
        nock('https://monitoring.googleapis.com')
            .persist()
            .intercept(
                '/v3/projects/' + WRONG_PROJECT_ID + '/metricDescriptors',
                'POST')
            .reply(403, 'Permission denied');

        const failExporter =
            new StackdriverStatsExporter({projectId: WRONG_PROJECT_ID});
        stats.registerExporter(failExporter);

        failExporter.onRegisterView(viewMetricDescriptor).catch((err) => {
          assert.ok(err.message.indexOf('Permission denied') >= 0);
          failExporter.close();
          done();
        });
      });

      it('.onRecord() Should not fail by wrong projectId, but trigger onMetricUploadError with error',
         (done) => {
           nock('https://monitoring.googleapis.com')
               .persist()
               .intercept(
                   '/v3/projects/' + WRONG_PROJECT_ID + '/timeSeries', 'POST')
               .reply(403, 'Permission denied');

           const failExporter = new StackdriverStatsExporter({
             period: 0,
             projectId: WRONG_PROJECT_ID,
             onMetricUploadError: (err) => {
               assert.ok(err.message.indexOf('Permission denied') >= 0);
               failExporter.close();
               done();
             }
           });
           stats.registerExporter(failExporter);
           viewTimeSeries.recordMeasurement(measurement);
           failExporter.onRecord([viewTimeSeries], measurement);
         });
    });

    describe('With metricPrefix option', () => {
      let prefixExporterOptions: StackdriverExporterOptions;
      let prefixExporter: StackdriverStatsExporter;

      before(() => {
        prefixExporterOptions =
            Object.assign(exporterOptions, {metricPrefix: 'test'});
        prefixExporter = new StackdriverStatsExporter(prefixExporterOptions);
        stats.registerExporter(prefixExporter);
      });

      after(() => {
        prefixExporter.close();
      });

      it(`should be reflected when onRegisterView is called`, async () => {
        if (dryrun) {
          nocks.metricDescriptors(PROJECT_ID, null, null, false);
        }
        await prefixExporter.onRegisterView(viewMetricDescriptor).then(() => {
          return assertMetricDescriptor(
              exporterTestLogger.debugBuffer[0], viewMetricDescriptor,
              prefixExporterOptions.metricPrefix);
        });
      });

      it(`should be reflected when onRecord is called`, async () => {
        if (dryrun) {
          nocks.timeSeries(PROJECT_ID, null, null, false);
        }
        viewTimeSeries.recordMeasurement(measurement);
        prefixExporter.onRecord([viewTimeSeries], measurement);

        await new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
          return assertTimeSeries(
              exporterTestLogger.debugBuffer[0][0], viewTimeSeries, measurement,
              PROJECT_ID, prefixExporterOptions.metricPrefix);
        });
      });
    });

    describe('With no network connection', () => {
      it('.onRegisterView() Should fail by network error', (done) => {
        nock('https://monitoring.googleapis.com')
            .persist()
            .intercept(
                '/v3/projects/' + PROJECT_ID + '/metricDescriptors', 'POST')
            .reply(443, 'Simulated Network Error');

        const failExporter =
            new StackdriverStatsExporter({projectId: PROJECT_ID});
        stats.registerExporter(failExporter);

        failExporter.onRegisterView(viewMetricDescriptor).catch((err) => {
          assert.ok(err.message.indexOf('Simulated Network Error') >= 0);
          failExporter.close();
          done();
        });
      });

      it('.onRecord() Should not fail by network error, but trigger onMetricUploadError with error',
         (done) => {
           nock('https://monitoring.googleapis.com')
               .persist()
               .intercept('/v3/projects/' + PROJECT_ID + '/timeSeries', 'POST')
               .reply(443, 'Simulated Network Error');

           const failExporter = new StackdriverStatsExporter({
             period: 0,
             projectId: PROJECT_ID,
             onMetricUploadError: (err) => {
               assert.ok(err.message.indexOf('Simulated Network Error') >= 0);
               failExporter.close();
               done();
             }
           });
           stats.registerExporter(failExporter);
           viewTimeSeries.recordMeasurement(measurement);
           failExporter.onRecord([viewTimeSeries], measurement);
         });
    });
  });
});
