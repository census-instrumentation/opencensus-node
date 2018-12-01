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
import {DistributionValue} from '../src/metrics/export/types';
import {AggregationType, DistributionData, Measure, Measurement, MeasureType, MeasureUnit, Tags, View} from '../src/stats/types';

/** The order of how close values must be to be considerated almost equal */
const EPSILON = 6;

interface AggregationTestCase {
  aggregationType: AggregationType;
  description: string;
}

function isAlmostEqual(
    actual: number, expected: number, epsilon: number): boolean {
  return Math.abs(actual - expected) < Math.pow(10, -epsilon);
}

function assertDistributionData(
    distributionData: DistributionData, values: number[]) {
  const valuesSum = values.reduce((acc, cur) => acc + cur);

  assert.strictEqual(distributionData.max, Math.max(...values));
  assert.strictEqual(distributionData.min, Math.min(...values));
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
    {aggregationType: AggregationType.SUM, description: 'Sum'},
    {aggregationType: AggregationType.COUNT, description: 'Count'},
    {aggregationType: AggregationType.LAST_VALUE, description: 'Last Value'}, {
      aggregationType: AggregationType.DISTRIBUTION,
      description: 'Distribution'
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

    it('should not record a measurement when it has wrong tag keys', () => {
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

    it('should not record a measurement when it has not enough tag keys',
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
    const {hrtime} = process;
    process.hrtime = () => [1000, 1e7];
    const measurementValues = [1.1, 2.3, 3.2, 4.3, 5.2];
    const buckets = [2, 4, 6];
    const tags: Tags = {testKey1: 'testValue', testKey2: 'testValue'};
    const aggregationType = AggregationType.DISTRIBUTION;
    const view: View = new BaseView(
        'test/view/name', measure, aggregationType, ['testKey1', 'testKey2'],
        'description test', buckets);
    for (const value of measurementValues) {
      const measurement = {measure, tags, value};
      view.recordMeasurement(measurement);
    }
    const {descriptor, timeseries} = view.getMetric();

    after(() => {
      process.hrtime = hrtime;
    });

    it('should has descriptor', () => {
      assert.ok(descriptor);
      assert.deepStrictEqual(descriptor, {
        description: 'description test',
        labelKeys: [{key: 'testKey1'}, {key: 'testKey2'}],
        name: 'test/view/name',
        type: 6,
        unit: '1',
      });
    });

    const [{startTimestamp, labelValues, points}] = timeseries;

    it('should has timeseries startTimestamp', () => {
      assert.ok(startTimestamp);
      assert.equal(typeof startTimestamp.nanos, 'number');
      assert.strictEqual(startTimestamp.nanos, 1e7);
      assert.equal(typeof startTimestamp.seconds, 'number');
      assert.strictEqual(startTimestamp.seconds, 1000);
    });

    it('should has labelValues', () => {
      assert.ok(labelValues);
      assert.deepStrictEqual(
          labelValues, [{value: 'testValue'}, {value: 'testValue'}]);
    });

    it('should has point', () => {
      assert.ok(points);
      const [point] = points;
      const {timestamp, value} = point;
      assert.ok(timestamp);
      assert.equal(typeof timestamp.nanos, 'number');
      assert.strictEqual(timestamp.nanos, 1e7);
      assert.equal(typeof timestamp.seconds, 'number');
      assert.strictEqual(timestamp.seconds, 1000);
      assert.notEqual(typeof value, 'number');
      assert.deepStrictEqual(
          (value as DistributionValue).bucketOptions,
          {explicit: {bounds: buckets}});
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
