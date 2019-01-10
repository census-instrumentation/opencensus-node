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

import {AggregationType, BaseView, logger, Logger, Measurement, MeasureUnit, Stats} from '@opencensus/core';
import * as assert from 'assert';
import * as fs from 'fs';
import * as nock from 'nock';
import {StackdriverStatsExporter} from '../src/stackdriver-monitoring';
import {MetricDescriptor, MetricKind, StackdriverExporterOptions, ValueType} from '../src/types';
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
}

describe('Stackdriver Stats Exporter', function() {
  this.timeout(0);
  // CircleCI pre-empts the VM
  const DELAY = 200;

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
  // constants for base views
  const lastValueDoubleView = new BaseView(
      'test/metricKindGauge', measureDouble, AggregationType.LAST_VALUE,
      tagKeys, 'Value Type Double');
  const lastValueINT64View = new BaseView(
      'test/metricKindGauge', measureInt64, AggregationType.LAST_VALUE, tagKeys,
      'Value Type INT64');
  const sumDoubleView = new BaseView(
      'test/metricKindCumulative', measureDouble, AggregationType.SUM, tagKeys,
      'Value Type Double');
  const sumINT64View = new BaseView(
      'test/metricKindCumulative', measureInt64, AggregationType.SUM, tagKeys,
      'Value Type INT64');
  const countINT64View = new BaseView(
      'test/metricKindGauge', measureInt64, AggregationType.COUNT, tagKeys,
      'Value Type INT64');
  const distributionDoubleView = new BaseView(
      'test/valueTypeDouble', measureDouble, AggregationType.DISTRIBUTION,
      tagKeys, 'Value Type Double', [10, 25, 30]);

  // constants for measurements
  const measurement1:
      Measurement = {measure: countINT64View.measure, value: 25, tags};
  const measurement2:
      Measurement = {measure: lastValueDoubleView.measure, value: 1.5, tags};

  // constants for resource information
  const resourceLabels: {[key: string]: string} = {project_id: PROJECT_ID};
  const resourceType = 'global';

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
    it('Should create a MeasureDouble with Metric Kind Gauge Metric Descriptor',
       async () => {
         if (dryrun) {
           nocks.metricDescriptors(PROJECT_ID, null, null, false);
         }
         await exporter.onRegisterView(lastValueDoubleView).then(() => {
           const metricDescriptor = exporterTestLogger.debugBuffer[0];
           assert.strictEqual(
               metricDescriptor.type,
               `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                   lastValueDoubleView.name}`);
           assert.strictEqual(
               metricDescriptor.description, lastValueDoubleView.description);
           assert.strictEqual(
               metricDescriptor.displayName, lastValueDoubleView.measure.name);
           assert.strictEqual(metricDescriptor.metricKind, MetricKind.GAUGE);
           assert.strictEqual(metricDescriptor.valueType, ValueType.DOUBLE);
           assert.strictEqual(
               metricDescriptor.unit, lastValueDoubleView.measure.unit);
         });
       });

    it('Should create a MeasureDouble with Metric Kind Cumulative Metric Descriptor',
       async () => {
         if (dryrun) {
           nocks.metricDescriptors(PROJECT_ID, null, null, false);
         }
         await exporter.onRegisterView(sumDoubleView).then(() => {
           const metricDescriptor = exporterTestLogger.debugBuffer[0];
           assert.strictEqual(
               metricDescriptor.type,
               `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                   sumDoubleView.name}`);
           assert.strictEqual(
               metricDescriptor.description, sumDoubleView.description);
           assert.strictEqual(
               metricDescriptor.displayName, sumDoubleView.measure.name);
           assert.strictEqual(
               metricDescriptor.metricKind, MetricKind.CUMULATIVE);
           assert.strictEqual(metricDescriptor.valueType, ValueType.DOUBLE);
           assert.strictEqual(
               metricDescriptor.unit, sumDoubleView.measure.unit);
         });
       });

    it('Should create a MeasureInt64 with Metric Kind Cumulative Metric Descriptor',
       async () => {
         if (dryrun) {
           nocks.metricDescriptors(PROJECT_ID, null, null, false);
         }
         await exporter.onRegisterView(sumINT64View).then(() => {
           const metricDescriptor = exporterTestLogger.debugBuffer[0];
           assert.strictEqual(
               metricDescriptor.type,
               `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                   sumINT64View.name}`);
           assert.strictEqual(
               metricDescriptor.description, sumINT64View.description);
           assert.strictEqual(
               metricDescriptor.displayName, sumINT64View.measure.name);
           assert.strictEqual(
               metricDescriptor.metricKind, MetricKind.CUMULATIVE);
           assert.strictEqual(metricDescriptor.valueType, ValueType.INT64);
           assert.strictEqual(metricDescriptor.unit, sumINT64View.measure.unit);
         });
       });

    it('Should create a MeasureInt64 with Metric Kind Gauge Metric Descriptor',
       async () => {
         if (dryrun) {
           nocks.metricDescriptors(PROJECT_ID, null, null, false);
         }
         await exporter.onRegisterView(lastValueINT64View).then(() => {
           const metricDescriptor = exporterTestLogger.debugBuffer[0];
           assert.strictEqual(
               metricDescriptor.type,
               `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                   lastValueINT64View.name}`);
           assert.strictEqual(
               metricDescriptor.description, lastValueINT64View.description);
           assert.strictEqual(
               metricDescriptor.displayName, lastValueINT64View.measure.name);
           assert.strictEqual(metricDescriptor.metricKind, MetricKind.GAUGE);
           assert.strictEqual(metricDescriptor.valueType, ValueType.INT64);
           assert.strictEqual(
               metricDescriptor.unit, lastValueINT64View.measure.unit);
         });
       });

    it('Should create a distribution aggregation Metric Descriptor',
       async () => {
         if (dryrun) {
           nocks.metricDescriptors(PROJECT_ID, null, null, false);
         }
         await exporter.onRegisterView(distributionDoubleView).then(() => {
           const metricDescriptor = exporterTestLogger.debugBuffer[0];
           assert.strictEqual(
               metricDescriptor.type,
               `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                   distributionDoubleView.name}`);
           assert.strictEqual(
               metricDescriptor.description,
               distributionDoubleView.description);
           assert.strictEqual(
               metricDescriptor.displayName,
               distributionDoubleView.measure.name);
           assert.strictEqual(
               metricDescriptor.metricKind, MetricKind.CUMULATIVE);
           assert.strictEqual(
               metricDescriptor.valueType, ValueType.DISTRIBUTION);
           assert.strictEqual(
               metricDescriptor.unit, distributionDoubleView.measure.unit);
         });
       });
  });

  /* Should create a Stackdriver Time Series */
  describe('Create Stackdriver Time Series', () => {
    it('Should create a doubleValue, lastvalue aggregation Time Series',
       async () => {
         if (dryrun) {
           nocks.metricDescriptors(PROJECT_ID, null, null, false);
           nocks.timeSeries(PROJECT_ID, null, null, false);
         }
         await exporter.onRegisterView(lastValueDoubleView).then(async () => {
           lastValueDoubleView.recordMeasurement(measurement2);
           exporter.onRecord([lastValueDoubleView], measurement2);
           await new Promise((resolve) => setTimeout(resolve, DELAY))
               .then(() => {
                 const timeSeries = exporterTestLogger.debugBuffer[1][0];
                 assert.strictEqual(
                     timeSeries.metric.type,
                     `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                         lastValueDoubleView.name}`);
                 assert.deepEqual(timeSeries.metric.labels, measurement2.tags);
                 assert.strictEqual(timeSeries.resource.type, resourceType);
                 assert.ok(timeSeries.resource.labels.project_id);
                 assert.strictEqual(
                     timeSeries.resource.labels.project_id,
                     resourceLabels.project_id);
                 assert.strictEqual(timeSeries.metricKind, MetricKind.GAUGE);
                 assert.strictEqual(timeSeries.valueType, ValueType.DOUBLE);
                 assert.ok(timeSeries.points.length > 0);
                 assert.deepStrictEqual(
                     timeSeries.points[0].value.doubleValue, 1.5);
               });
         });
       });

    it('Should create a int64Value, lastvalue aggregation Time Series',
       async () => {
         if (dryrun) {
           nocks.metricDescriptors(PROJECT_ID, null, null, false);
           nocks.timeSeries(PROJECT_ID, null, null, false);
         }
         await exporter.onRegisterView(lastValueINT64View).then(async () => {
           lastValueINT64View.recordMeasurement(measurement1);
           exporter.onRecord([lastValueINT64View], measurement1);
           await new Promise((resolve) => setTimeout(resolve, DELAY))
               .then(() => {
                 const timeSeries = exporterTestLogger.debugBuffer[1][0];
                 assert.strictEqual(
                     timeSeries.metric.type,
                     `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                         lastValueINT64View.name}`);
                 assert.deepEqual(timeSeries.metric.labels, measurement1.tags);
                 assert.strictEqual(timeSeries.resource.type, resourceType);
                 assert.ok(timeSeries.resource.labels.project_id);
                 assert.strictEqual(
                     timeSeries.resource.labels.project_id,
                     resourceLabels.project_id);
                 assert.strictEqual(timeSeries.metricKind, MetricKind.GAUGE);
                 assert.strictEqual(timeSeries.valueType, ValueType.INT64);
                 assert.ok(timeSeries.points.length > 0);
                 assert.deepStrictEqual(
                     timeSeries.points[0].value.int64Value, 25);
               });
         });
       });

    it('Should create a int64Value, sum aggregation Time Series', async () => {
      if (dryrun) {
        nocks.metricDescriptors(PROJECT_ID, null, null, false);
        nocks.timeSeries(PROJECT_ID, null, null, false);
      }
      await exporter.onRegisterView(sumINT64View).then(async () => {
        sumINT64View.recordMeasurement(measurement1);
        sumINT64View.recordMeasurement(measurement1);
        sumINT64View.recordMeasurement(measurement1);
        exporter.onRecord([sumINT64View], measurement1);
        await new Promise((resolve) => setTimeout(resolve, DELAY)).then(() => {
          const timeSeries = exporterTestLogger.debugBuffer[1][0];
          assert.strictEqual(
              timeSeries.metric.type,
              `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                  sumINT64View.name}`);
          assert.deepEqual(timeSeries.metric.labels, measurement1.tags);
          assert.strictEqual(timeSeries.resource.type, resourceType);
          assert.ok(timeSeries.resource.labels.project_id);
          assert.strictEqual(
              timeSeries.resource.labels.project_id, resourceLabels.project_id);
          assert.strictEqual(timeSeries.metricKind, MetricKind.CUMULATIVE);
          assert.strictEqual(timeSeries.valueType, ValueType.INT64);
          assert.ok(timeSeries.points.length > 0);
          assert.deepStrictEqual(timeSeries.points[0].value.int64Value, 75);
        });
      });
    });

    it('Should create a int64Value, count aggregation Time Series',
       async () => {
         if (dryrun) {
           nocks.metricDescriptors(PROJECT_ID, null, null, false);
           nocks.timeSeries(PROJECT_ID, null, null, false);
         }
         await exporter.onRegisterView(countINT64View).then(async () => {
           countINT64View.recordMeasurement(measurement1);
           countINT64View.recordMeasurement(measurement1);
           countINT64View.recordMeasurement(measurement1);
           countINT64View.recordMeasurement(measurement1);
           exporter.onRecord([countINT64View], measurement1);
           await new Promise((resolve) => setTimeout(resolve, DELAY))
               .then(() => {
                 const timeSeries = exporterTestLogger.debugBuffer[1][0];
                 assert.strictEqual(
                     timeSeries.metric.type,
                     `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                         countINT64View.name}`);
                 assert.deepEqual(timeSeries.metric.labels, measurement1.tags);
                 assert.strictEqual(timeSeries.resource.type, resourceType);
                 assert.ok(timeSeries.resource.labels.project_id);
                 assert.strictEqual(
                     timeSeries.resource.labels.project_id,
                     resourceLabels.project_id);
                 assert.strictEqual(
                     timeSeries.metricKind, MetricKind.CUMULATIVE);
                 assert.strictEqual(timeSeries.valueType, ValueType.INT64);
                 assert.ok(timeSeries.points.length > 0);
                 assert.deepStrictEqual(
                     timeSeries.points[0].value.int64Value, 4);
               });
         });
       });

    it('Should create a distribution Time Series with bound 0 as first item',
       async () => {
         if (dryrun) {
           nocks.metricDescriptors(PROJECT_ID, null, null, false);
           nocks.timeSeries(PROJECT_ID, null, null, false);
         }
         await exporter.onRegisterView(distributionDoubleView)
             .then(async () => {
               distributionDoubleView.recordMeasurement(measurement1);
               exporter.onRecord([distributionDoubleView], measurement1);

               await new Promise((resolve) => setTimeout(resolve, 10))
                   .then(() => {
                     const timeSeries = exporterTestLogger.debugBuffer[1][0];
                     assert.deepStrictEqual(
                         timeSeries.points[0].value.distributionValue.count, 1);
                     assert.deepStrictEqual(
                         timeSeries.points[0].value.distributionValue.mean, 25);
                     assert.deepStrictEqual(
                         timeSeries.points[0]
                             .value.distributionValue.sumOfSquaredDeviation,
                         0);
                     const {bucketOptions, bucketCounts} =
                         timeSeries.points[0].value.distributionValue;
                     assert.deepStrictEqual(
                         bucketOptions.explicitBuckets.bounds, [0, 10, 25, 30]);
                     assert.deepStrictEqual(bucketCounts, [0, 0, 0, 1, 0]);
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

    describe('With valid projectId', () => {
      it(`.onRegisterView() should be successfull`, async () => {
        if (dryrun) {
          nocks.metricDescriptors(PROJECT_ID, null, null, false);
        }
        await exporter.onRegisterView(viewMetricDescriptor).then(() => {
          const metricDescriptor = exporterTestLogger.debugBuffer[0];
          assert.strictEqual(
              metricDescriptor.type,
              `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                  viewMetricDescriptor.name}`);
          assert.strictEqual(
              metricDescriptor.description, viewMetricDescriptor.description);
          assert.strictEqual(
              metricDescriptor.displayName, viewMetricDescriptor.measure.name);
          assert.strictEqual(metricDescriptor.metricKind, MetricKind.GAUGE);
          assert.strictEqual(metricDescriptor.valueType, ValueType.DOUBLE);
          assert.strictEqual(
              metricDescriptor.unit, viewMetricDescriptor.measure.unit);
        });
      });

      it(`.onRecord() Should be successfull`, async () => {
        if (dryrun) {
          nocks.timeSeries(PROJECT_ID, null, null, false);
        }
        viewTimeSeries.recordMeasurement(measurement1);
        exporter.onRecord([viewTimeSeries], measurement1);

        await new Promise((resolve) => setTimeout(resolve, DELAY)).then(() => {
          // return assertTimeSeries(
          //     exporterTestLogger.debugBuffer[0][0], viewTimeSeries,
          //     measurement1, PROJECT_ID, MetricKind.GAUGE, ValueType.DOUBLE,
          //     {doubleValue: 25});
          const timeSeries = exporterTestLogger.debugBuffer[0][0];
          assert.strictEqual(
              timeSeries.metric.type,
              `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                  viewTimeSeries.name}`);
          assert.deepEqual(timeSeries.metric.labels, measurement1.tags);
          assert.strictEqual(timeSeries.resource.type, resourceType);
          assert.ok(timeSeries.resource.labels.project_id);
          assert.strictEqual(
              timeSeries.resource.labels.project_id, resourceLabels.project_id);
          assert.strictEqual(timeSeries.metricKind, MetricKind.GAUGE);
          assert.strictEqual(timeSeries.valueType, ValueType.DOUBLE);
          assert.ok(timeSeries.points.length > 0);
          assert.deepStrictEqual(timeSeries.points[0].value.doubleValue, 25);
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
           viewTimeSeries.recordMeasurement(measurement1);
           failExporter.onRecord([viewTimeSeries], measurement1);
         });
    });

    describe('With prefix option', () => {
      describe('should be reflected when onRegisterView is called', () => {
        const {name} = viewMetricDescriptor;
        let prefixExporter: StackdriverStatsExporter;
        beforeEach(() => {
          if (dryrun) {
            nocks.metricDescriptors(PROJECT_ID, null, null, false);
          }
        });

        afterEach(() => {
          prefixExporter.close();
        });

        it('should use custom domain if prefix is undefined', async () => {
          prefixExporter = new StackdriverStatsExporter(exporterOptions);
          stats.registerExporter(prefixExporter);
          await prefixExporter.onRegisterView(viewMetricDescriptor).then(() => {
            const metricDescriptor: MetricDescriptor =
                exporterTestLogger.debugBuffer[0];
            assert.strictEqual(
                metricDescriptor.type,
                `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${name}`);
          });
        });

        it('should use custom domain if prefix is null', async () => {
          const prefixExporterOptions: StackdriverExporterOptions =
              Object.assign({prefix: null}, exporterOptions);
          prefixExporter = new StackdriverStatsExporter(prefixExporterOptions);
          stats.registerExporter(prefixExporter);
          await prefixExporter.onRegisterView(viewMetricDescriptor).then(() => {
            const metricDescriptor: MetricDescriptor =
                exporterTestLogger.debugBuffer[0];
            assert.strictEqual(
                metricDescriptor.type,
                `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${name}`);
          });
        });

        it('should use custom domain if prefix is empty', async () => {
          const prefixExporterOptions: StackdriverExporterOptions =
              Object.assign({prefix: ''}, exporterOptions);
          prefixExporter = new StackdriverStatsExporter(prefixExporterOptions);
          stats.registerExporter(prefixExporter);
          await prefixExporter.onRegisterView(viewMetricDescriptor).then(() => {
            const metricDescriptor: MetricDescriptor =
                exporterTestLogger.debugBuffer[0];
            assert.strictEqual(
                metricDescriptor.type,
                `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${name}`);
          });
        });

        it('should use defined prefix', async () => {
          const prefix = 'test';
          const prefixExporterOptions: StackdriverExporterOptions =
              Object.assign({prefix}, exporterOptions);
          prefixExporter = new StackdriverStatsExporter(prefixExporterOptions);
          stats.registerExporter(prefixExporter);
          await prefixExporter.onRegisterView(viewMetricDescriptor).then(() => {
            const metricDescriptor: MetricDescriptor =
                exporterTestLogger.debugBuffer[0];
            assert.strictEqual(metricDescriptor.type, `${prefix}/${name}`);
          });
        });
      });

      describe('should be reflected when onRecord is called', () => {
        let prefixExporter: StackdriverStatsExporter;
        const {name} = viewTimeSeries;

        beforeEach(() => {
          if (dryrun) {
            nocks.timeSeries(PROJECT_ID, null, null, false);
          }
        });

        afterEach(() => {
          prefixExporter.close();
        });

        it('should use custom domain if prefix is undefined', async () => {
          prefixExporter = new StackdriverStatsExporter(exporterOptions);
          stats.registerExporter(prefixExporter);

          viewTimeSeries.recordMeasurement(measurement1);
          prefixExporter.onRecord([viewTimeSeries], measurement1);

          await new Promise((resolve) => setTimeout(resolve, DELAY))
              .then(() => {
                const timeSeries = exporterTestLogger.debugBuffer[0][0];
                assert.strictEqual(
                    timeSeries.metric.type,
                    `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                        name}`);
              });
        });

        it('should use custom domain if prefix is null', async () => {
          const prefixExporterOptions: StackdriverExporterOptions =
              Object.assign({prefix: null}, exporterOptions);
          prefixExporter = new StackdriverStatsExporter(prefixExporterOptions);
          stats.registerExporter(prefixExporter);

          viewTimeSeries.recordMeasurement(measurement1);
          prefixExporter.onRecord([viewTimeSeries], measurement1);

          await new Promise((resolve) => setTimeout(resolve, DELAY))
              .then(() => {
                const timeSeries = exporterTestLogger.debugBuffer[0][0];
                assert.strictEqual(
                    timeSeries.metric.type,
                    `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                        name}`);
              });
        });

        it('should use custom domain if prefix is empty', async () => {
          const prefixExporterOptions: StackdriverExporterOptions =
              Object.assign({prefix: ''}, exporterOptions);
          prefixExporter = new StackdriverStatsExporter(prefixExporterOptions);
          stats.registerExporter(prefixExporter);

          viewTimeSeries.recordMeasurement(measurement1);
          prefixExporter.onRecord([viewTimeSeries], measurement1);

          await new Promise((resolve) => setTimeout(resolve, DELAY))
              .then(() => {
                const timeSeries = exporterTestLogger.debugBuffer[0][0];
                assert.strictEqual(
                    timeSeries.metric.type,
                    `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${
                        name}`);
              });
        });

        it('should use defined prefix', async () => {
          const prefix = 'test';
          const prefixExporterOptions: StackdriverExporterOptions =
              Object.assign(exporterOptions, {prefix});
          prefixExporter = new StackdriverStatsExporter(prefixExporterOptions);

          viewTimeSeries.recordMeasurement(measurement1);
          prefixExporter.onRecord([viewTimeSeries], measurement1);

          await new Promise((resolve) => setTimeout(resolve, DELAY))
              .then(() => {
                const timeSeries = exporterTestLogger.debugBuffer[0][0];
                assert.strictEqual(timeSeries.metric.type, `${prefix}/${name}`);
              });
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
           viewTimeSeries.recordMeasurement(measurement1);
           failExporter.onRecord([viewTimeSeries], measurement1);
         });
    });
  });
});
