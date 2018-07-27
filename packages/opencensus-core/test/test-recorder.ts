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
import * as mocha from 'mocha';

import {Recorder} from '../src';
import {AggregationType, CountData, DistributionData, LastValueData, Measure, Measurement, MeasureType, MeasureUnit, SumData, Tags} from '../src/stats/types';

/** The order of how close values must be to be considerated almost equal */
const EPSILON = 6;

interface RecorderTestCase {
  values: number[];
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

  for (const bucket of distributionData.buckets) {
    const expectedBucketCount =
        values.filter(value => bucket.min <= value && value < bucket.max)
            .length;
    assert.strictEqual(bucket.count, expectedBucketCount);
  }

  const expectedMean = valuesSum / values.length;
  assert.ok(isAlmostEqual(distributionData.mean, expectedMean, EPSILON));

  const expectedSumSquaredDeviations =
      values.map(value => Math.pow(value - expectedMean, 2))
          .reduce((acc, curr) => acc + curr);
  assert.ok(isAlmostEqual(
      distributionData.sumSquaredDeviations, expectedSumSquaredDeviations,
      EPSILON));

  const expectedStdDeviation =
      Math.sqrt(expectedSumSquaredDeviations / values.length);
  assert.ok(isAlmostEqual(
      distributionData.stdDeviation, expectedStdDeviation, EPSILON));
}

describe('Recorder', () => {
  const measure: Measure = {
    name: 'Test Measure',
    type: MeasureType.DOUBLE,
    unit: MeasureUnit.UNIT
  };
  const tags: Tags = {testKey: 'testValue'};
  const testCases: RecorderTestCase[] = [
    {values: [1.1, 2.5, 3.2, 4.7, 5.2], description: 'with positive values'}, {
      values: [-1.5, -2.3, -3.7, -4.3, -5.9],
      description: 'with negative values'
    },
    {values: [0, 0, 0, 0], description: 'with zeros'},
    {values: [1.1, -2.3, 3.2, -4.3, 5.2], description: 'with mixed values'}
  ];

  describe('Add measurements to a Count Aggregation Data', () => {
    for (const testCase of testCases) {
      const countData: CountData =
          {type: AggregationType.COUNT, tags, timestamp: Date.now(), value: 0};

      it(`should record measurements ${testCase.description} correctly`, () => {
        let count = 0;
        for (const value of testCase.values) {
          count++;
          const measurement: Measurement = {measure, tags, value};
          const updatedAggregationData =
              Recorder.addMeasurement(countData, measurement) as CountData;

          assert.strictEqual(updatedAggregationData.value, count);
        }
      });
    }
  });

  describe('Add measurements to a Last Value Aggregation Data', () => {
    for (const testCase of testCases) {
      const lastValueData: LastValueData = {
        type: AggregationType.LAST_VALUE,
        tags,
        timestamp: Date.now(),
        value: undefined
      };

      it(`should record measurements ${testCase.description} correctly`, () => {
        for (const value of testCase.values) {
          const measurement: Measurement = {measure, tags, value};
          const updatedAggregationData =
              Recorder.addMeasurement(lastValueData, measurement) as
              LastValueData;

          assert.strictEqual(updatedAggregationData.value, value);
        }
      });
    }
  });

  describe('Add measurements to a Sum Aggregation Data', () => {
    for (const testCase of testCases) {
      const sumData: SumData =
          {type: AggregationType.SUM, tags, timestamp: Date.now(), value: 0};

      it(`should record measurements ${testCase.description} correctly`, () => {
        let acc = 0;
        for (const value of testCase.values) {
          acc += value;
          const measurement: Measurement = {measure, tags, value};
          const updatedAggregationData =
              Recorder.addMeasurement(sumData, measurement) as SumData;

          assert.strictEqual(updatedAggregationData.value, acc);
        }
      });
    }
  });

  describe('Add measurements to a Distribution Aggregation Data', () => {
    for (const testCase of testCases) {
      const distributionData: DistributionData = {
        type: AggregationType.DISTRIBUTION,
        tags,
        timestamp: Date.now(),
        startTime: Date.now(),
        count: 0,
        sum: 0,
        max: Number.MIN_SAFE_INTEGER,
        min: Number.MAX_SAFE_INTEGER,
        mean: 0,
        stdDeviation: 0,
        sumSquaredDeviations: 0,
        buckets: [
          {max: 0, min: -Infinity, count: 0}, {max: 2, min: 0, count: 0},
          {max: 4, min: 2, count: 0}, {max: 6, min: 4, count: 0},
          {max: Infinity, min: 6, count: 0}
        ],
        bucketsBoundaries: [0, 2, 4, 6]
      };

      it(`should record measurements ${testCase.description} correctly`, () => {
        const sentValues = [];
        for (const value of testCase.values) {
          sentValues.push(value);
          const measurement: Measurement = {measure, tags, value};
          const updatedAggregationData =
              Recorder.addMeasurement(distributionData, measurement) as
              DistributionData;

          assertDistributionData(distributionData, sentValues);
        }
      });
    }
  });
});
