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

import * as assert from 'assert';

import {BaseView} from '../src';
import {TEST_ONLY} from '../src/common/time-util';
import {DistributionValue, MetricDescriptorType, Timestamp} from '../src/metrics/export/types';
import {AggregationType, DistributionData, Measure, Measurement, MeasureType, MeasureUnit, Tags, View} from '../src/stats/types';

/** The order of how close values must be to be considerated almost equal */
const EPSILON = 6;

interface AggregationTestCase {
  aggregationType: AggregationType;
  description: string;
  metricDescriptorType: MetricDescriptorType;
}

function isAlmostEqual(
    actual: number, expected: number, epsilon: number): boolean {
  return Math.abs(actual - expected) < Math.pow(10, -epsilon);
}

function assertDistributionData(
    distributionData: DistributionData, values: number[]) {
  const valuesSum = values.reduce((acc, cur) => acc + cur);

  assert.strictEqual(distributionData.count, values.length);
  assert.strictEqual(distributionData.sum, valuesSum);

  const expectedMean = valuesSum / values.length;
  assert.ok(isAlmostEqual(distributionData.mean, expectedMean, EPSILON));

  const expectedSumSquaredDeviations =
      values.map(value => Math.pow(value - expectedMean, 2))
          .reduce((acc, curr) => acc + curr);
  assert.ok(isAlmostEqual(
      distributionData.sumOfSquaredDeviation, expectedSumSquaredDeviations,
      EPSILON));

  const expectedStdDeviation =
      Math.sqrt(expectedSumSquaredDeviations / values.length);
  assert.ok(isAlmostEqual(
      distributionData.stdDeviation, expectedStdDeviation, EPSILON));
}

function assertView(
    view: View, measurement: Measurement, recordedValues: number[],
    aggregationType: AggregationType) {
  assert.strictEqual(view.aggregation, aggregationType);
  const aggregationData = view.getSnapshot(measurement.tags);
  switch (aggregationData.type) {
    case AggregationType.SUM:
      const acc = recordedValues.reduce((acc, cur) => acc + cur);
      assert.strictEqual(aggregationData.value, acc);
      break;
    case AggregationType.COUNT:
      assert.strictEqual(aggregationData.value, recordedValues.length);
      break;
    case AggregationType.DISTRIBUTION:
      assertDistributionData(aggregationData, recordedValues);
      break;
    default:
      assert.strictEqual(
          aggregationData.value, recordedValues[recordedValues.length - 1]);
      break;
  }
}

describe('BaseView', () => {
  const measure: Measure = {
    name: 'Test Measure',
    type: MeasureType.DOUBLE,
    unit: MeasureUnit.UNIT
  };

  const aggregationTestCases: AggregationTestCase[] = [
    {
      aggregationType: AggregationType.SUM,
      description: 'Sum',
      metricDescriptorType: MetricDescriptorType.CUMULATIVE_DOUBLE
    },
    {
      aggregationType: AggregationType.COUNT,
      description: 'Count',
      metricDescriptorType: MetricDescriptorType.CUMULATIVE_INT64
    },
    {
      aggregationType: AggregationType.LAST_VALUE,
      description: 'Last Value',
      metricDescriptorType: MetricDescriptorType.GAUGE_DOUBLE
    },
    {
      aggregationType: AggregationType.DISTRIBUTION,
      description: 'Distribution',
      metricDescriptorType: MetricDescriptorType.CUMULATIVE_DISTRIBUTION
    }
  ];

  describe('getColumns()', () => {
    it('should access the given tag keys', () => {
      const tagKeys = ['testKey1', 'testKey2'];
      const view = new BaseView(
          'test/view/name', measure, AggregationType.LAST_VALUE, tagKeys,
          'description test');

      assert.strictEqual(view.getColumns(), tagKeys);
    });
  });

  describe('recordMeasurement()', () => {
    const measurementValues = [1.1, 2.3, 3.2, 4.3, 5.2];
    const bucketBoundaries = [2, 4, 6];
    const tags: Tags = {testKey1: 'testValue', testKey2: 'testValue'};

    for (const aggregationTestCase of aggregationTestCases) {
      it(`should record measurements on a View with ${
             aggregationTestCase.description} Aggregation Data type`,
         () => {
           const view = new BaseView(
               'test/view/name', measure, aggregationTestCase.aggregationType,
               ['testKey1', 'testKey2'], 'description test', bucketBoundaries);
           const recordedValues = [];
           for (const value of measurementValues) {
             recordedValues.push(value);
             const measurement = {measure, tags, value};
             view.recordMeasurement(measurement);
             assertView(
                 view, measurement, recordedValues,
                 aggregationTestCase.aggregationType);
           }
         });
    }

    it('should ignore negative bucket bounds', () => {
      const negativeBucketBoundaries = [-Infinity, -4, -2, 0, 2, 4, 6];
      const view = new BaseView(
          'test/view/name', measure, AggregationType.DISTRIBUTION,
          ['testKey1', 'testKey2'], 'description test',
          negativeBucketBoundaries);
      const recordedValues = [];
      for (const value of measurementValues) {
        recordedValues.push(value);
        const measurement = {measure, tags, value};
        view.recordMeasurement(measurement);
      }
      const data = view.getSnapshot(tags) as DistributionData;
      assert.deepStrictEqual(data.buckets, [2, 4, 6]);
      assert.deepStrictEqual(data.bucketCounts, [1, 2, 2, 0]);
    });

    const view = new BaseView(
        'test/view/name', measure, AggregationType.LAST_VALUE,
        ['testKey1', 'testKey2'], 'description test');

    it('should not record a measurement when it have wrong tag keys', () => {
      const measurement = {measure, tags: {testKey3: 'testValue'}, value: 10};
      view.recordMeasurement(measurement);
      assert.ok(!view.getSnapshot(measurement.tags));
    });

    it('should not record a measurement when tags are not valid', () => {
      const measurement = {
        measure,
        tags: {testKey3: String.fromCharCode(30) + 'testValue'},
        value: 10
      };
      view.recordMeasurement(measurement);
      assert.ok(!view.getSnapshot(measurement.tags));
    });

    it('should not record a measurement when it have not enough tag keys',
       () => {
         const measurement = {
           measure,
           tags: {testKey1: 'testValue'},
           value: 10
         };
         view.recordMeasurement(measurement);
         assert.ok(!view.getSnapshot(measurement.tags));
       });
  });

  describe('getMetric()', () => {
    const realHrtimeFn = process.hrtime;
    const realNowFn = Date.now;
    const mockedTime: Timestamp = {seconds: 1450000100, nanos: 1e7};
    const mockStartTime = 1546540757282;
    const mockStartTimestamp: Timestamp = {seconds: 1546540757, nanos: 282e6};
    const measurementValues = [1.1, 2.3, 3.2, 4.3, 5.2];
    const buckets = [2, 4, 6];
    const tags: Tags = {testKey1: 'testValue', testKey2: 'testValue'};
    const tags1: Tags = {testKey1: 'testValue1', testKey2: 'testValue1'};

    for (const aggregationTestCase of aggregationTestCases) {
      const view: View = new BaseView(
          'test/view/name', measure, aggregationTestCase.aggregationType,
          ['testKey1', 'testKey2'], 'description test', buckets);
      for (const value of measurementValues) {
        const measurement = {measure, tags, value};
        view.recordMeasurement(measurement);
      }

      beforeEach(() => {
        process.hrtime = () => [100, 1e7];
        Date.now = () => 1450000000000;
        // Force the clock to recalibrate the time offset with the mocked time
        TEST_ONLY.setHrtimeReference();
      });

      afterEach(() => {
        process.hrtime = realHrtimeFn;
        Date.now = realNowFn;
        // Reset the hrtime reference so that it uses a real clock again.
        TEST_ONLY.resetHrtimeFunctionCache();
      });

      const {descriptor, timeseries} = view.getMetric(mockStartTime);

      describe(
          `Aggregation type: ${aggregationTestCase.aggregationType}`, () => {
            it('should have descriptor', () => {
              assert.ok(descriptor);
              assert.deepStrictEqual(descriptor, {
                description: 'description test',
                labelKeys: [
                  {key: 'testKey1', description: ''},
                  {key: 'testKey2', description: ''}
                ],
                name: 'test/view/name',
                type: aggregationTestCase.metricDescriptorType,
                unit: '1',
              });
            });

            const [{startTimestamp, labelValues}] = timeseries;

            if (aggregationTestCase.metricDescriptorType ===
                MetricDescriptorType.GAUGE_INT64) {
              it('GAUGE_INT64 shouldnt have timeseries startTimestamp', () => {
                assert.strictEqual(startTimestamp, undefined);
              });
            } else if (
                aggregationTestCase.metricDescriptorType ===
                MetricDescriptorType.GAUGE_DOUBLE) {
              it('GAUGE_DOUBLE shouldnt have timeseries startTimestamp', () => {
                assert.strictEqual(startTimestamp, undefined);
              });
            } else {
              it('should have timeseries startTimestamp', () => {
                assert.ok(startTimestamp);
                assert.equal(typeof startTimestamp.nanos, 'number');
                assert.equal(typeof startTimestamp.seconds, 'number');
                assert.deepStrictEqual(startTimestamp, mockStartTimestamp);
              });
            }

            it('should have labelValues', () => {
              assert.ok(labelValues);
              assert.deepStrictEqual(
                  labelValues, [{value: 'testValue'}, {value: 'testValue'}]);
            });
          });
    }

    describe('DISTRIBUTION aggregation type', () => {
      const view: View = new BaseView(
          'test/view/name', measure, AggregationType.DISTRIBUTION,
          ['testKey1', 'testKey2'], 'description test', buckets);
      let total = 0;
      for (const value of measurementValues) {
        total += value;
        const measurement = {measure, tags, value};
        view.recordMeasurement(measurement);
      }

      it('should have point', () => {
        const {timeseries} = view.getMetric(mockStartTime);
        const [{points, startTimestamp}] = timeseries;
        assert.ok(points);
        const [point] = points;
        const {timestamp, value} = point;
        assert.ok(timestamp);
        assert.equal(typeof timestamp.nanos, 'number');
        assert.equal(typeof timestamp.seconds, 'number');
        assert.equal(timestamp.seconds, mockedTime.seconds);
        assert.equal(timestamp.nanos, mockedTime.nanos);
        assert.notEqual(typeof value, 'number');
        assert.deepStrictEqual((value as DistributionValue), {
          bucketOptions: {explicit: {bounds: buckets}},
          buckets: [{count: 1}, {count: 2}, {count: 2}, {count: 0}],
          count: 5,
          sum: total,
          sumOfSquaredDeviation: 10.427999999999997
        });

        assert.deepStrictEqual(startTimestamp, mockStartTimestamp);
      });
    });

    describe(
        'DISTRIBUTION aggregation type: record with measurements in succession from a single view and single measure',
        () => {
          const view: View = new BaseView(
              'test/view/name', measure, AggregationType.DISTRIBUTION,
              ['testKey1', 'testKey2'], 'description test', buckets);
          let total = 0;
          for (const value of measurementValues) {
            total += value;
            const measurement = {measure, tags, value};
            const measurement1 = {measure, tags: tags1, value};
            view.recordMeasurement(measurement);
            view.recordMeasurement(measurement1);
          }

          it('should have points', () => {
            const {timeseries} = view.getMetric(mockStartTime);
            assert.equal(timeseries.length, 2);
            const [{labelValues: labelValues1, points: points1}, {
              labelValues: labelValues2,
              points: points2
            }] = timeseries;
            assert.ok(points1);

            let [point] = points1;
            let {timestamp, value} = point;
            assert.ok(timestamp);
            assert.equal(typeof timestamp.nanos, 'number');
            assert.equal(typeof timestamp.seconds, 'number');
            assert.equal(timestamp.seconds, mockedTime.seconds);
            assert.equal(timestamp.nanos, mockedTime.nanos);
            assert.notEqual(typeof value, 'number');
            assert.deepStrictEqual((value as DistributionValue), {
              bucketOptions: {explicit: {bounds: buckets}},
              buckets: [{count: 1}, {count: 2}, {count: 2}, {count: 0}],
              count: 5,
              sum: total,
              sumOfSquaredDeviation: 10.427999999999997
            });
            assert.deepEqual(
                labelValues1, [{'value': 'testValue'}, {'value': 'testValue'}]);

            assert.ok(points2);
            [point] = points2;
            ({timestamp, value} = point);
            assert.ok(timestamp);
            assert.equal(typeof timestamp.nanos, 'number');
            assert.equal(typeof timestamp.seconds, 'number');
            assert.equal(timestamp.seconds, mockedTime.seconds);
            assert.equal(timestamp.nanos, mockedTime.nanos);
            assert.notEqual(typeof value, 'number');
            assert.deepStrictEqual((value as DistributionValue), {
              bucketOptions: {explicit: {bounds: buckets}},
              buckets: [{count: 1}, {count: 2}, {count: 2}, {count: 0}],
              count: 5,
              sum: total,
              sumOfSquaredDeviation: 10.427999999999997
            });
            assert.deepEqual(
                labelValues2,
                [{'value': 'testValue1'}, {'value': 'testValue1'}]);
          });
        });

    describe('COUNT aggregation type', () => {
      const view: View = new BaseView(
          'test/view/name', measure, AggregationType.COUNT,
          ['testKey1', 'testKey2'], 'description test', buckets);
      for (const value of measurementValues) {
        const measurement = {measure, tags, value};
        view.recordMeasurement(measurement);
      }

      it('should have point', () => {
        const {timeseries} = view.getMetric(mockStartTime);
        const [{points, startTimestamp}] = timeseries;
        assert.ok(points);
        const [point] = points;
        const {timestamp, value} = point;
        assert.ok(timestamp);
        assert.equal(typeof timestamp.nanos, 'number');
        assert.equal(typeof timestamp.seconds, 'number');
        assert.equal(timestamp.seconds, mockedTime.seconds);
        assert.equal(timestamp.nanos, mockedTime.nanos);
        assert.equal(typeof value, 'number');
        assert.strictEqual(value, 5);
        assert.deepStrictEqual(startTimestamp, mockStartTimestamp);
      });
    });

    describe('SUM aggregation type', () => {
      const view: View = new BaseView(
          'test/view/name', measure, AggregationType.SUM,
          ['testKey1', 'testKey2'], 'description test', buckets);
      let total = 0;
      for (const value of measurementValues) {
        total += value;
        const measurement = {measure, tags, value};
        view.recordMeasurement(measurement);
      }

      it('should have point', () => {
        const {timeseries} = view.getMetric(mockStartTime);
        const [{points, startTimestamp}] = timeseries;
        assert.ok(points);
        const [point] = points;
        const {timestamp, value} = point;
        assert.ok(timestamp);
        assert.equal(typeof timestamp.nanos, 'number');
        assert.equal(typeof timestamp.seconds, 'number');
        assert.equal(timestamp.seconds, mockedTime.seconds);
        assert.equal(timestamp.nanos, mockedTime.nanos);
        assert.equal(typeof value, 'number');
        assert.strictEqual(value, total);
        assert.deepStrictEqual(startTimestamp, mockStartTimestamp);
      });
    });

    describe('LAST_VALUE aggregation type', () => {
      const view: View = new BaseView(
          'test/view/name', measure, AggregationType.LAST_VALUE,
          ['testKey1', 'testKey2'], 'description test', buckets);
      for (const value of measurementValues) {
        const measurement = {measure, tags, value};
        view.recordMeasurement(measurement);
      }

      it('should have point', () => {
        const {timeseries} = view.getMetric(mockStartTime);
        const [{points, startTimestamp}] = timeseries;
        assert.ok(points);
        const [point] = points;
        const {timestamp, value} = point;
        assert.equal(timestamp.seconds, mockedTime.seconds);
        assert.equal(timestamp.nanos, mockedTime.nanos);
        assert.equal(typeof value, 'number');
        assert.strictEqual(
            value, measurementValues[measurementValues.length - 1]);
        assert.strictEqual(startTimestamp, undefined);
      });
    });
  });

  describe('getSnapshots()', () => {
    const tags: Tags = {testKey1: 'testValue', testKey2: 'testValue'};
    let view: View;

    before(() => {
      view = new BaseView(
          'test/view/name', measure, AggregationType.LAST_VALUE,
          ['testKey1', 'testKey2'], 'description test');

      const measurement = {measure, tags, value: 10};
      view.recordMeasurement(measurement);
    });

    it('should not get aggregation data when wrong tags values are given',
       () => {
         assert.ok(!view.getSnapshot(
             {testKey1: 'wrongTagValue', testKey2: 'wrongTagValue'}));
       });

    it('should not get aggregation data when not enough tags are given', () => {
      assert.ok(!view.getSnapshot({testKey1: 'testValue'}));
    });

    it('should get aggregation data when tags are correct', () => {
      assert.ok(view.getSnapshot(tags));
    });
  });
});
