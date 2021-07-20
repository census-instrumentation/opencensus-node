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
import { Recorder, TagMap, TagTtl } from '../src';
import {
  AggregationType,
  CountData,
  DistributionData,
  LastValueData,
  Measure,
  Measurement,
  MeasureType,
  MeasureUnit,
  SumData,
} from '../src/stats/types';

/** The order of how close values must be to be considerated almost equal */
const EPSILON = 6;

interface RecorderTestCase {
  values: number[];
  description: string;
}

function isAlmostEqual(
  actual: number,
  expected: number,
  epsilon: number
): boolean {
  return Math.abs(actual - expected) < Math.pow(10, -epsilon);
}

function assertDistributionData(
  distributionData: DistributionData,
  values: number[]
) {
  const valuesSum = values.reduce((acc, cur) => acc + cur);

  assert.strictEqual(distributionData.count, values.length);
  assert.strictEqual(distributionData.sum, valuesSum);

  const expectedMean = valuesSum / values.length;
  assert.ok(isAlmostEqual(distributionData.mean, expectedMean, EPSILON));

  const expectedSumSquaredDeviations = values
    .map(value => Math.pow(value - expectedMean, 2))
    .reduce((acc, curr) => acc + curr);
  assert.ok(
    isAlmostEqual(
      distributionData.sumOfSquaredDeviation,
      expectedSumSquaredDeviations,
      EPSILON
    )
  );

  const expectedStdDeviation = Math.sqrt(
    expectedSumSquaredDeviations / values.length
  );
  assert.ok(
    isAlmostEqual(distributionData.stdDeviation, expectedStdDeviation, EPSILON)
  );
}

describe('Recorder', () => {
  const measures: Measure[] = [
    {
      name: 'Test Measure 1',
      type: MeasureType.DOUBLE,
      unit: MeasureUnit.UNIT,
    },
    { name: 'Test Measure 2', type: MeasureType.INT64, unit: MeasureUnit.UNIT },
  ];
  const tagValues = [{ value: 'testValue' }];
  const testCases: RecorderTestCase[] = [
    { values: [1.1, 2.5, 3.2, 4.7, 5.2], description: 'with positive values' },
    {
      values: [-1.5, -2.3, -3.7, -4.3, -5.9],
      description: 'with negative values',
    },
    { values: [0, 0, 0, 0], description: 'with zeros' },
    { values: [1.1, -2.3, 3.2, -4.3, 5.2], description: 'with mixed values' },
  ];

  for (const measure of measures) {
    describe(`for count aggregation data of ${measure.type} values`, () => {
      for (const testCase of testCases) {
        it(`should record measurements ${testCase.description} correctly`, () => {
          const countData: CountData = {
            type: AggregationType.COUNT,
            tagValues,
            timestamp: Date.now(),
            value: 0,
          };
          let count = 0;
          for (const value of testCase.values) {
            count++;
            const measurement: Measurement = { measure, value };
            const updatedAggregationData = Recorder.addMeasurement(
              countData,
              measurement
            ) as CountData;

            assert.strictEqual(updatedAggregationData.value, count);
          }
        });
      }
    });

    describe(`for last value aggregation data of ${measure.type} values`, () => {
      for (const testCase of testCases) {
        it(`should record measurements ${testCase.description} correctly`, () => {
          const lastValueData: LastValueData = {
            type: AggregationType.LAST_VALUE,
            tagValues,
            timestamp: Date.now(),
            value: 0,
          };
          for (const value of testCase.values) {
            const measurement: Measurement = { measure, value };
            const lastValue =
              measure.type === MeasureType.DOUBLE ? value : Math.trunc(value);

            const updatedAggregationData = Recorder.addMeasurement(
              lastValueData,
              measurement
            ) as LastValueData;
            assert.strictEqual(updatedAggregationData.value, lastValue);
          }
        });
      }
    });

    describe(`for sum aggregation data of ${measure.type} values`, () => {
      for (const testCase of testCases) {
        it(`should record measurements ${testCase.description} correctly`, () => {
          const sumData: SumData = {
            type: AggregationType.SUM,
            tagValues,
            timestamp: Date.now(),
            value: 0,
          };
          let acc = 0;
          for (const value of testCase.values) {
            acc +=
              measure.type === MeasureType.DOUBLE ? value : Math.trunc(value);
            const measurement: Measurement = { measure, value };
            const updatedAggregationData = Recorder.addMeasurement(
              sumData,
              measurement
            ) as SumData;

            assert.strictEqual(updatedAggregationData.value, acc);
          }
        });
      }
    });

    describe(`for distribution aggregation data of ${measure.type} values`, () => {
      for (const testCase of testCases) {
        it(`should record measurements ${testCase.description} correctly`, () => {
          const distributionData: DistributionData = {
            type: AggregationType.DISTRIBUTION,
            tagValues,
            timestamp: Date.now(),
            startTime: Date.now(),
            count: 0,
            sum: 0,
            mean: 0,
            stdDeviation: 0,
            sumOfSquaredDeviation: 0,
            buckets: [2, 4, 6],
            bucketCounts: [0, 0, 0, 0],
          };
          const sentValues = [];
          for (const value of testCase.values) {
            sentValues.push(
              measure.type === MeasureType.DOUBLE ? value : Math.trunc(value)
            );
            const measurement: Measurement = { measure, value };
            const updatedAggregationData = Recorder.addMeasurement(
              distributionData,
              measurement
            ) as DistributionData;
            assertDistributionData(updatedAggregationData, sentValues);
          }
        });
      }
    });

    describe('for distribution aggregation data with attachments', () => {
      const attachments = { k1: 'v1', k2: 'v2', k3: 'v3' };
      it('should record measurements and attachments correctly', () => {
        const distributionData: DistributionData = {
          type: AggregationType.DISTRIBUTION,
          tagValues,
          timestamp: Date.now(),
          startTime: Date.now(),
          count: 0,
          sum: 0,
          mean: 0,
          stdDeviation: 0,
          sumOfSquaredDeviation: 0,
          buckets: [2, 4, 6],
          bucketCounts: [0, 0, 0, 0],
          exemplars: new Array(4),
        };
        const value = 5;
        const measurement: Measurement = { measure, value };
        const aggregationData = Recorder.addMeasurement(
          distributionData,
          measurement,
          attachments
        ) as DistributionData;

        assert.strictEqual(aggregationData.sum, 5);
        assert.strictEqual(aggregationData.mean, 5);
        assert.deepStrictEqual(aggregationData.buckets, [2, 4, 6]);
        assert.deepStrictEqual(aggregationData.bucketCounts, [0, 0, 1, 0]);
        assert.deepStrictEqual(aggregationData.exemplars![0], undefined);
        assert.deepStrictEqual(aggregationData.exemplars![1], undefined);
        assert.deepStrictEqual(aggregationData!.exemplars![2], {
          value: 5,
          timestamp: aggregationData.timestamp,
          attachments,
        });
        assert.deepStrictEqual(aggregationData.exemplars![3], undefined);
      });
    });

    describe('getTagValues()', () => {
      const CALLER = { name: 'caller' };
      const METHOD = { name: 'method' };
      const ORIGINATOR = { name: 'originator' };
      const CALLER_V = { value: 'some caller' };
      const METHOD_V = { value: 'some method' };
      const ORIGINATOR_V = { value: 'some originator' };
      const NO_PROPAGATION_MD = { tagTtl: TagTtl.NO_PROPAGATION };
      const UNLIMITED_PROPAGATION_MD = { tagTtl: TagTtl.UNLIMITED_PROPAGATION };
      let tagMap: TagMap;

      beforeEach(() => {
        tagMap = new TagMap();
      });

      it('should return tag values from tags and columns', () => {
        const columns = [CALLER, METHOD];
        tagMap.set(CALLER, CALLER_V);
        tagMap.set(METHOD, METHOD_V);
        const tagValues = Recorder.getTagValues(tagMap.tags, columns);
        assert.strictEqual(tagValues.length, 2);
        assert.deepStrictEqual(tagValues, [CALLER_V, METHOD_V]);
      });

      it('should return tag values from tags and columns when using metadata', () => {
        const columns = [CALLER, METHOD];
        tagMap.set(CALLER, CALLER_V, NO_PROPAGATION_MD);
        tagMap.set(METHOD, METHOD_V, UNLIMITED_PROPAGATION_MD);
        const tagValues = Recorder.getTagValues(tagMap.tags, columns);
        assert.strictEqual(tagValues.length, 2);
        assert.deepStrictEqual(tagValues, [CALLER_V, METHOD_V]);
      });

      it('should return tag values from tags and columns with extra keys', () => {
        const columns = [CALLER, METHOD, ORIGINATOR];
        tagMap.set(CALLER, CALLER_V);
        tagMap.set(METHOD, METHOD_V);
        const tagValues = Recorder.getTagValues(tagMap.tags, columns);
        assert.strictEqual(tagValues.length, 3);
        assert.deepStrictEqual(tagValues, [CALLER_V, METHOD_V, null]);
      });

      it('should return tag values from tags and columns with extra tags', () => {
        const columns = [CALLER, METHOD];
        tagMap.set(CALLER, CALLER_V);
        tagMap.set(METHOD, METHOD_V);
        tagMap.set(ORIGINATOR, ORIGINATOR_V);
        const tagValues = Recorder.getTagValues(tagMap.tags, columns);
        assert.strictEqual(tagValues.length, 2);
        assert.deepStrictEqual(tagValues, [CALLER_V, METHOD_V]);
      });
    });
  }
});
