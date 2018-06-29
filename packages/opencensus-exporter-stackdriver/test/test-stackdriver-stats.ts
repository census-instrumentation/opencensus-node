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

import {Aggregation, AggregationDistribution, AggregationSum, logger, Measure, MeasureDouble, MeasureInt64, Measurement, StatsManager, Tags, View} from '@opencensus/core';
import * as assert from 'assert';
import * as fs from 'fs';
import * as mocha from 'mocha';
import * as nock from 'nock';

import {StackdriverExporterOptions, StackdriverStatsExporter} from '../src/';
import {LabelDescriptor, MetricDescriptor, MetricKind, TimeSeries, ValueType} from '../src/types';

import * as nocks from './nocks';

/** An ad-hoc type for tests purposes only */
type TestData = {
  description: string,
  measure?: Measure,
  measurement?: Measurement, aggregation: Aggregation
};

process.env.UV_THREADPOOL_SIZE = '10';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
let PROJECT_ID = 'fake-project-id';

/**
 * Creates a view with test params.
 * @param sufix A sufix to be added to the view name.
 * @param measure A Measure to associate with the view.
 * @param aggregation An Aggregation to associate with the view.
 * @param tags A Tags to associate with the view.
 */
function createTestView(
    sufix: string, measure: Measure, aggregation: Aggregation,
    tags: Tags): View {
  return {
    name: 'test/view/' + sufix,
    description: 'Test view description',
    measure,
    aggregation,
    columns: tags,
    startTime: new Date()
  } as View;
}

/**
 * Asserts MetricDescriptors' values given its originating view and measure.
 * @param metricDescriptor The MetricDescriptor to be asserted.
 * @param view The originating view.
 * @param measure The originating measure.
 */
function assertMetricDescriptor(
    metricDescriptor: MetricDescriptor, view: View, measure: Measure) {
  let metricKind: MetricKind;
  if (view.aggregation instanceof AggregationSum) {
    metricKind = MetricKind.CUMULATIVE;
  } else {
    metricKind = MetricKind.GAUGE;
  }

  let valueType: ValueType;
  if (measure instanceof MeasureDouble) {
    valueType = ValueType.DOUBLE;
  } else if (view.aggregation instanceof AggregationDistribution) {
    valueType = ValueType.DISTRIBUTION;
  } else {
    valueType = ValueType.INT64;
  }

  assert.strictEqual(
      metricDescriptor.type, `custom.googleapis.com/${view.name}`);
  assert.strictEqual(metricDescriptor.description, view.description);
  assert.strictEqual(metricDescriptor.displayName, measure.name);
  assert.strictEqual(metricDescriptor.metricKind, metricKind);
  assert.strictEqual(metricDescriptor.valueType, valueType);
  assert.strictEqual(metricDescriptor.unit, measure.unit);
}

/**
 * Asserts TimeSeries' values given its originating view and measurement.
 * @param TimeSeries The TimeSeries to be asserted.
 * @param view The originating view.
 * @param measurement The originating measurement.
 * @param projectId The project ID from the Stackdriver Monitoring.
 */
function assertTimeSeries(
    timeSeries: TimeSeries, view: View, measurement: Measurement,
    projectId: string) {
  const resourceLabels: {[key: string]: string} = {project_id: projectId};

  let pointValueType: string;
  if (measurement.measure instanceof MeasureInt64) {
    pointValueType = 'int64Value';
  } else if (measurement.measure instanceof MeasureDouble) {
    pointValueType = 'doubleValue';
  }

  let metricKind: MetricKind;
  if (view.aggregation instanceof AggregationSum) {
    metricKind = MetricKind.CUMULATIVE;
  } else {
    metricKind = MetricKind.GAUGE;
  }

  let valueType: ValueType;
  if (measurement.measure instanceof MeasureDouble) {
    valueType = ValueType.DOUBLE;
  } else if (view.aggregation instanceof AggregationDistribution) {
    valueType = ValueType.DISTRIBUTION;
  } else {
    valueType = ValueType.INT64;
  }

  assert.strictEqual(
      timeSeries.metric.type, `custom.googleapis.com/${view.name}`);
  assert.strictEqual(timeSeries.metric.labels, view.columns);
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

  let exporterOptions: StackdriverExporterOptions;
  let exporter: StackdriverStatsExporter;
  const statsManager = new StatsManager();
  let oauth2Scope: nock.Scope;

  const measureDouble = new MeasureDouble(
      'Measure Double Test', 'Measure Double Test Description', 'By');
  const measureInt64 = new MeasureInt64(
      'Measure Int64 Test', 'Measure Int64 Test Description', 'By');
  const aggregationDistribution =
      statsManager.createAggregationDistribution([0, 16, 256]);
  const aggregationSum = statsManager.createAggregationSum();
  const aggregationLastValue = statsManager.createAggregationLastValue();
  const tags = {'test_tag_key': 'test_tag_value'};


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

  // after(() => {
  //   if (dryrun) {
  //     oauth2Scope.done();
  //     nock.cleanAll();
  //     nock.enableNetConnect();
  //   }
  // });

  /* Should create a Stackdriver Metric Descriptor to Stackdriver */
  describe('Create Stackdriver Metric Descriptors', () => {
    const testsData: TestData[] = [
      {
        description: 'Metric Kind Gauge',
        measure: measureDouble,
        aggregation: aggregationLastValue
      },
      {
        description: 'Metric Kind Cumulative',
        measure: measureDouble,
        aggregation: aggregationSum
      },
      {
        description: 'Value Type Int64',
        measure: measureInt64,
        aggregation: aggregationSum
      },
      {
        description: 'Value Type Double',
        measure: measureDouble,
        aggregation: aggregationSum
      }
    ];

    testsData.map((testData, i) => {
      it(`Should create a ${testData.description} Metric Descriptor`,
         async () => {
           if (dryrun) {
             // nocks.oauth2((body) => true);
             nocks.metricDescriptors(PROJECT_ID, null, null, false);
           }
           const view = createTestView(
               `metricDescriptor/${i}`, testData.measure, testData.aggregation,
               tags);
           await exporter.onRegisterView(view, testData.measure)
               .then((result: MetricDescriptor) => {
                 assertMetricDescriptor(result, view, testData.measure);
               });
         });
    });
  });

  /* Should create a Stackdriver Time Series to Stackdriver */
  describe('Create Stackdriver Time Series', () => {
    const testsData: TestData[] = [
      {
        description: 'Metric Kind Gauge',
        measurement: {measure: measureDouble, value: 100},
        aggregation: aggregationLastValue
      },
      {
        description: 'Metric Kind Cumulative',
        measurement: {measure: measureDouble, value: 100},
        aggregation: aggregationSum
      },
      {
        description: 'Value Type Double',
        measurement: {measure: measureDouble, value: 100},
        aggregation: aggregationLastValue
      },
      {
        description: 'Value Type Int64',
        measurement: {measure: measureInt64, value: 100},
        aggregation: aggregationLastValue
      }
    ];

    testsData.map((testData, i) => {
      if (dryrun) {
        // nocks.oauth2((body) => true);
        nocks.timeSeries(PROJECT_ID, null, null, false);
      }
      it(`Should create a ${testData.description} Time Series`, async () => {
        const view = createTestView(
            `timeSeries/${i}`, testData.measurement.measure,
            testData.aggregation, tags);
        await exporter.onRecord(view, testData.measurement)
            .then((result: TimeSeries) => {
              assertTimeSeries(result, view, testData.measurement, PROJECT_ID);
            });
      });
    });
  });

  /**
   * Should send a Stackdriver Metric Descriptor and Time Series to Stackdriver.
   */
  describe('Send data to Stackdriver', () => {
    const viewMetric = createTestView(
        `metricDescriptor/send`, measureDouble, aggregationLastValue, tags);
    const viewTimeSeries = createTestView(
        `timeSeries/send`, measureDouble, aggregationLastValue, tags);
    const measurement = {measure: measureDouble, value: 100};

    describe('With valid projectId', () => {
      it(`.onRegisterView() Should be successfull`, async () => {
        if (dryrun) {
          // nocks.oauth2((body) => true);
          nocks.metricDescriptors(PROJECT_ID, null, null, false);
        }
        await exporter.onRegisterView(viewMetric, measureDouble)
            .then((result: MetricDescriptor) => {
              assertMetricDescriptor(result, viewMetric, measureDouble);
            });
      });

      it(`.onRecord() Should be successfull`, async () => {
        if (dryrun) {
          // nocks.oauth2((body) => true);
          nocks.timeSeries(PROJECT_ID, null, null, false);
        }
        await exporter.onRecord(viewMetric, measurement)
            .then((result: TimeSeries) => {
              assertTimeSeries(result, viewMetric, measurement, PROJECT_ID);
            });
      });
    });

    describe('With wrong projectId', () => {
      const WRONG_PROJECT_ID = 'wrong-project-id';
      if (dryrun) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS =
            __dirname + '/fixtures/fakecredentials.json';
        // nocks.oauth2((body) => true);
        nocks.metricDescriptors(WRONG_PROJECT_ID, null, null, false);
      }

      const failExporterOptions = {
        projectId: WRONG_PROJECT_ID,
        logger: logger.logger('debug')
      };
      const failExporter = new StackdriverStatsExporter(failExporterOptions);

      it('.onRegisterView() Should fail by wrong projectId', () => {
        failExporter.onRegisterView(viewMetric, measureDouble)
            .catch((err: Error) => {
              assert.ok(err.message.indexOf('Permission denied') >= 0);
            });
      });

      it('.onRecord() Should fail by wrong projectId', () => {
        failExporter.onRecord(viewMetric, measurement).catch((err: Error) => {
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
        if (dryrun) {
          // nocks.oauth2((body) => true);
        }
        await exporter.onRegisterView(viewMetric, measureDouble)
            .catch((err: Error) => {
              assert.ok(err.message.indexOf('Simulated Network Error') >= 0);
            });
      });

      it('.onRecord() Should fail by network error', async () => {
        nock('https://monitoring.googleapis.com')
            .persist()
            .intercept('/v3/projects/' + PROJECT_ID + '/timeSeries', 'POST')
            .reply(443, 'Simulated Network Error');
        if (dryrun) {
          // nocks.oauth2((body) => true);
        }
        await exporter.onRecord(viewMetric, measurement).catch((err: Error) => {
          assert.ok(err.message.indexOf('Simulated Network Error') >= 0);
        });
      });
    });
  });
});