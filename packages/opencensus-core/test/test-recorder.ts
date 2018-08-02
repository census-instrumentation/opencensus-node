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
    const expectedBucketCount = values
                                    .filter(
                                        value => bucket.lowBoundary <= value &&
                                            value < bucket.highBoundary)
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
  const measures: Measure[] = [
    {name: 'Test Measure 1', type: MeasureType.DOUBLE, unit: MeasureUnit.UNIT},
    {name: 'Test Measure 2', type: MeasureType.INT64, unit: MeasureUnit.UNIT}
  ];
  const tags: Tags = {testKey: 'testValue'};
  const testCases: RecorderTestCase[] = [
    {values: [1.1, 2.5, 3.2, 4.7, 5.2], description: 'with positive values'}, {
      values: [-1.5, -2.3, -3.7, -4.3, -5.9],
      description: 'with negative values'
    },
    {values: [0, 0, 0, 0], description: 'with zeros'},
    {values: [1.1, -2.3, 3.2, -4.3, 5.2], description: 'with mixed values'}
  ];

  for (const measure of measures) {
    describe(`for count aggregation data of ${measure.type} values`, () => {
      for (const testCase of testCases) {
        it(`should record measurements ${testCase.description} correctly`,
           () => {
             const countData: CountData = {
               type: AggregationType.COUNT,
               tags,
               timestamp: Date.now(),
               value: 0
             };
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

    describe(
        `for last value aggregation data of ${measure.type} values`, () => {
          for (const testCase of testCases) {
            it(`should record measurements ${testCase.description} correctly`,
               () => {
                 const lastValueData: LastValueData = {
                   type: AggregationType.LAST_VALUE,
                   tags,
                   timestamp: Date.now(),
                   value: undefined
                 };
                 for (const value of testCase.values) {
                   const measurement: Measurement = {measure, tags, value};
                   const lastValue = measure.type === MeasureType.DOUBLE ?
                       value :
                       Math.trunc(value);

                   const updatedAggregationData =
                       Recorder.addMeasurement(lastValueData, measurement) as
                       LastValueData;
                   assert.strictEqual(updatedAggregationData.value, lastValue);
                 }
               });
          }
        });

    describe(`for sum aggregation data of ${measure.type} values`, () => {
      for (const testCase of testCases) {
        it(`should record measurements ${testCase.description} correctly`,
           () => {
             const sumData: SumData = {
               type: AggregationType.SUM,
               tags,
               timestamp: Date.now(),
               value: 0
             };
             let acc = 0;
             for (const value of testCase.values) {
               acc += measure.type === MeasureType.DOUBLE ? value :
                                                            Math.trunc(value);
               const measurement: Measurement = {measure, tags, value};
               const updatedAggregationData =
                   Recorder.addMeasurement(sumData, measurement) as SumData;

               assert.strictEqual(updatedAggregationData.value, acc);
             }
           });
      }
    });

    describe(
        `for distribution aggregation data of ${measure.type} values`, () => {
          for (const testCase of testCases) {
            it(`should record measurements ${testCase.description} correctly`,
               () => {
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
                     {highBoundary: 0, lowBoundary: -Infinity, count: 0},
                     {highBoundary: 2, lowBoundary: 0, count: 0},
                     {highBoundary: 4, lowBoundary: 2, count: 0},
                     {highBoundary: 6, lowBoundary: 4, count: 0},
                     {highBoundary: Infinity, lowBoundary: 6, count: 0}
                   ]
                 };
                 const sentValues = [];
                 for (const value of testCase.values) {
                   sentValues.push(
                       measure.type === MeasureType.DOUBLE ? value :
                                                             Math.trunc(value));
                   const measurement: Measurement = {measure, tags, value};
                   const updatedAggregationData =
                       Recorder.addMeasurement(distributionData, measurement) as
                       DistributionData;

                   assertDistributionData(distributionData, sentValues);
                 }
               });
          }
        });
  }
});
