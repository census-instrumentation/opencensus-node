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

import { BaseView, TagMap, TagValue } from '../src';
import { TEST_ONLY } from '../src/common/time-util';
import {
  DistributionValue,
  MetricDescriptorType,
  Timestamp,
} from '../src/metrics/export/types';
import {
  AggregationType,
  DistributionData,
  Measure,
  MeasureType,
  MeasureUnit,
  View,
} from '../src/stats/types';

/** The order of how close values must be to be considerated almost equal */
const EPSILON = 6;

interface AggregationTestCase {
  aggregationType: AggregationType;
  description: string;
  metricDescriptorType: MetricDescriptorType;
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

function assertView(
  view: View,
  recordedValues: number[],
  aggregationType: AggregationType,
  tagValues: TagValue[]
) {
  assert.strictEqual(view.aggregation, aggregationType);
  const aggregationData = view.getSnapshot(tagValues);
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
        aggregationData.value,
        recordedValues[recordedValues.length - 1]
      );
      break;
  }
}

describe('BaseView', () => {
  const measure: Measure = {
    name: 'Test Measure',
    type: MeasureType.DOUBLE,
    unit: MeasureUnit.UNIT,
  };

  const aggregationTestCases: AggregationTestCase[] = [
    {
      aggregationType: AggregationType.SUM,
      description: 'Sum',
      metricDescriptorType: MetricDescriptorType.CUMULATIVE_DOUBLE,
    },
    {
      aggregationType: AggregationType.COUNT,
      description: 'Count',
      metricDescriptorType: MetricDescriptorType.CUMULATIVE_INT64,
    },
    {
      aggregationType: AggregationType.LAST_VALUE,
      description: 'Last Value',
      metricDescriptorType: MetricDescriptorType.GAUGE_DOUBLE,
    },
    {
      aggregationType: AggregationType.DISTRIBUTION,
      description: 'Distribution',
      metricDescriptorType: MetricDescriptorType.CUMULATIVE_DISTRIBUTION,
    },
  ];

  describe('getColumns()', () => {
    it('should access the given tag keys', () => {
      const tagKeys = [{ name: 'testKey1' }, { name: 'testKey2' }];
      const view = new BaseView(
        'test/view/name',
        measure,
        AggregationType.LAST_VALUE,
        tagKeys,
        'description test'
      );

      assert.deepStrictEqual(view.getColumns(), tagKeys);
    });
  });

  describe('createView()', () => {
    it('should throw error when keys are duplicate', () => {
      const tagKeys = [
        { name: 'testKey1' },
        { name: 'testKey1' },
        { name: 'testKey2' },
      ];
      assert.throws(() => {
        const view = new BaseView(
          'test/view/name',
          measure,
          AggregationType.LAST_VALUE,
          tagKeys,
          'description test'
        );
        assert.deepStrictEqual(view.getColumns(), tagKeys);
      }, /^Error: Columns have duplicate$/);
    });
  });

  describe('recordMeasurement()', () => {
    const measurementValues = [1.1, 2.3, 3.2, 4.3, 5.2];
    const bucketBoundaries = [2, 4, 6];
    const tagKey1 = { name: 'testKey1' };
    const tagKey2 = { name: 'testKey2' };
    const tagKeys = [tagKey1, tagKey2];
    const tagKey3 = { name: 'testKey3' };
    const tagValue1 = { value: 'testValue1' };
    const tagValue2 = { value: 'testValue2' };
    const tagValue3 = { value: 'testValue3' };

    const tags = new TagMap();
    tags.set(tagKey1, tagValue1);
    tags.set(tagKey2, tagValue2);

    for (const aggregationTestCase of aggregationTestCases) {
      it(`should record measurements on a View with ${aggregationTestCase.description} Aggregation Data type`, () => {
        const view = new BaseView(
          'test/view/name',
          measure,
          aggregationTestCase.aggregationType,
          tagKeys,
          'description test',
          bucketBoundaries
        );
        const recordedValues = [];
        for (const value of measurementValues) {
          recordedValues.push(value);
          const measurement = { measure, value };
          view.recordMeasurement(measurement, tags);
          assertView(
            view,
            recordedValues,
            aggregationTestCase.aggregationType,
            [tagValue1, tagValue2]
          );
        }
      });
    }

    it('should ignore negative bucket bounds', () => {
      const negativeBucketBoundaries = [-Infinity, -4, -2, 0, 2, 4, 6];
      const view = new BaseView(
        'test/view/name',
        measure,
        AggregationType.DISTRIBUTION,
        tagKeys,
        'description test',
        negativeBucketBoundaries
      );
      const recordedValues = [];
      for (const value of measurementValues) {
        recordedValues.push(value);
        const measurement = { measure, value };
        view.recordMeasurement(measurement, tags);
      }
      const data = view.getSnapshot([tagValue1, tagValue2]) as DistributionData;
      assert.deepStrictEqual(data.buckets, [2, 4, 6]);
      assert.deepStrictEqual(data.bucketCounts, [1, 2, 2, 0]);
    });

    const view = new BaseView(
      'test/view/name',
      measure,
      AggregationType.LAST_VALUE,
      tagKeys,
      'description test'
    );

    it('should not record a measurement when it have wrong tag keys', () => {
      const tagMap = new TagMap();
      tagMap.set(tagKey3, tagValue3);
      const measurement = { measure, value: 10 };
      view.recordMeasurement(measurement, tagMap);
      assert.ok(!view.getSnapshot([tagValue3]));
    });
  });

  describe('getMetric()', () => {
    const realHrtimeFn = process.hrtime;
    const realNowFn = Date.now;
    const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };
    const mockStartTime = 1546540757282;
    const mockStartTimestamp: Timestamp = { seconds: 1546540757, nanos: 282e6 };
    const measurementValues = [1.1, 2.3, 3.2, 4.3, 5.2];
    const buckets = [2, 4, 6];
    const tagKey1 = { name: 'testKey1' };
    const tagKey2 = { name: 'testKey2' };
    const tagKeys = [tagKey1, tagKey2];
    const tagValue1 = { value: 'testValue1' };
    const tagValue2 = { value: 'testValue2' };
    const tagValue3 = { value: 'testValue3' };
    const tagValue4 = { value: 'testValue4' };

    const tags = new TagMap();
    tags.set(tagKey1, tagValue1);
    tags.set(tagKey2, tagValue2);

    const tagMap = new TagMap();
    tagMap.set(tagKey1, tagValue3);
    tagMap.set(tagKey2, tagValue4);

    for (const aggregationTestCase of aggregationTestCases) {
      const view: View = new BaseView(
        'test/view/name',
        measure,
        aggregationTestCase.aggregationType,
        tagKeys,
        'description test',
        buckets
      );
      for (const value of measurementValues) {
        const measurement = { measure, value };
        view.recordMeasurement(measurement, tags);
      }

      beforeEach(() => {
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'bigint' is missing in type '() => [numbe... Remove this comment to see the full error message
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

      const { descriptor, timeseries } = view.getMetric(mockStartTime);

      describe(`Aggregation type: ${aggregationTestCase.aggregationType}`, () => {
        it('should have descriptor', () => {
          assert.ok(descriptor);
          assert.deepStrictEqual(descriptor, {
            description: 'description test',
            labelKeys: [
              { key: 'testKey1', description: '' },
              { key: 'testKey2', description: '' },
            ],
            name: 'test/view/name',
            type: aggregationTestCase.metricDescriptorType,
            unit: '1',
          });
        });

        const [{ startTimestamp, labelValues }] = timeseries;

        if (
          aggregationTestCase.metricDescriptorType ===
          MetricDescriptorType.GAUGE_INT64
        ) {
          it('GAUGE_INT64 shouldnt have timeseries startTimestamp', () => {
            assert.strictEqual(startTimestamp, undefined);
          });
        } else if (
          aggregationTestCase.metricDescriptorType ===
          MetricDescriptorType.GAUGE_DOUBLE
        ) {
          it('GAUGE_DOUBLE shouldnt have timeseries startTimestamp', () => {
            assert.strictEqual(startTimestamp, undefined);
          });
        } else {
          it('should have timeseries startTimestamp', () => {
            assert.ok(startTimestamp);
            assert.strictEqual(typeof startTimestamp!.nanos, 'number');
            assert.strictEqual(typeof startTimestamp!.seconds, 'number');
            assert.deepStrictEqual(startTimestamp, mockStartTimestamp);
          });
        }

        it('should have labelValues', () => {
          assert.ok(labelValues);
          assert.deepStrictEqual(labelValues, [
            { value: 'testValue1' },
            { value: 'testValue2' },
          ]);
        });
      });
    }

    describe('DISTRIBUTION aggregation type', () => {
      const view: View = new BaseView(
        'test/view/name',
        measure,
        AggregationType.DISTRIBUTION,
        tagKeys,
        'description test',
        buckets
      );
      let total = 0;
      for (const value of measurementValues) {
        total += value;
        const measurement = { measure, value };
        view.recordMeasurement(measurement, tags);
      }

      it('should have point', () => {
        const { timeseries } = view.getMetric(mockStartTime);
        const [{ points, startTimestamp }] = timeseries;
        assert.ok(points);
        const [point] = points;
        const { timestamp, value } = point;
        assert.ok(timestamp);
        assert.strictEqual(typeof timestamp.nanos, 'number');
        assert.strictEqual(typeof timestamp.seconds, 'number');
        assert.strictEqual(timestamp.seconds, mockedTime.seconds);
        assert.strictEqual(timestamp.nanos, mockedTime.nanos);
        assert.notStrictEqual(typeof value, 'number');
        assert.deepStrictEqual(value as DistributionValue, {
          bucketOptions: { explicit: { bounds: buckets } },
          buckets: [{ count: 1 }, { count: 2 }, { count: 2 }, { count: 0 }],
          count: 5,
          sum: total,
          sumOfSquaredDeviation: 10.427999999999997,
        });

        assert.deepStrictEqual(startTimestamp, mockStartTimestamp);
      });
    });

    describe('DISTRIBUTION aggregation type with exemplars', () => {
      const realNowFn = Date.now;
      before(() => {
        Date.now = () => 1450000000000;
      });
      after(() => {
        Date.now = realNowFn;
      });

      it('should have point with attachments', () => {
        const view: View = new BaseView(
          'test/view/name',
          measure,
          AggregationType.DISTRIBUTION,
          tagKeys,
          'description test',
          buckets
        );
        let total = 0;
        const attachments = { k1: 'v1', k2: 'v2', k3: 'v3' };
        for (const value of measurementValues) {
          total += value;
          const measurement = { measure, value };
          view.recordMeasurement(measurement, tags, attachments);
        }

        const { timeseries } = view.getMetric(mockStartTime);
        const [{ points, startTimestamp }] = timeseries;
        assert.ok(points);
        const [point] = points;
        const { timestamp, value } = point;
        assert.ok(timestamp);
        assert.deepStrictEqual(value as DistributionValue, {
          bucketOptions: { explicit: { bounds: buckets } },
          buckets: [
            {
              count: 1,
              exemplar: {
                value: 1.1,
                timestamp: { seconds: 1450000000, nanos: 0 },
                attachments,
              },
            },
            {
              count: 2,
              exemplar: {
                value: 3.2,
                timestamp: { seconds: 1450000000, nanos: 0 },
                attachments,
              },
            },
            {
              count: 2,
              exemplar: {
                value: 5.2,
                timestamp: { seconds: 1450000000, nanos: 0 },
                attachments,
              },
            },
            { count: 0 },
          ],
          count: 5,
          sum: total,
          sumOfSquaredDeviation: 10.427999999999997,
        });
        assert.deepStrictEqual(startTimestamp, mockStartTimestamp);
      });

      it('should have point with empty attachments', () => {
        const view: View = new BaseView(
          'test/view/name',
          measure,
          AggregationType.DISTRIBUTION,
          tagKeys,
          'description test',
          buckets
        );
        let total = 0;
        for (const value of measurementValues) {
          total += value;
          const measurement = { measure, value };
          view.recordMeasurement(measurement, tags, {});
        }

        const { timeseries } = view.getMetric(mockStartTime);
        const [{ points, startTimestamp }] = timeseries;
        assert.ok(points);
        const [point] = points;
        const { timestamp, value } = point;
        assert.ok(timestamp);
        assert.deepStrictEqual(value as DistributionValue, {
          bucketOptions: { explicit: { bounds: buckets } },
          buckets: [
            {
              count: 1,
              exemplar: {
                value: 1.1,
                timestamp: { seconds: 1450000000, nanos: 0 },
                attachments: {},
              },
            },
            {
              count: 2,
              exemplar: {
                value: 3.2,
                timestamp: { seconds: 1450000000, nanos: 0 },
                attachments: {},
              },
            },
            {
              count: 2,
              exemplar: {
                value: 5.2,
                timestamp: { seconds: 1450000000, nanos: 0 },
                attachments: {},
              },
            },
            { count: 0 },
          ],
          count: 5,
          sum: total,
          sumOfSquaredDeviation: 10.427999999999997,
        });
        assert.deepStrictEqual(startTimestamp, mockStartTimestamp);
      });
    });

    describe('DISTRIBUTION aggregation type: record with measurements in succession from a single view and single measure', () => {
      const view: View = new BaseView(
        'test/view/name',
        measure,
        AggregationType.DISTRIBUTION,
        tagKeys,
        'description test',
        buckets
      );
      let total = 0;
      for (const value of measurementValues) {
        total += value;
        const measurement = { measure, value };
        const measurement1 = { measure, value };
        view.recordMeasurement(measurement, tags);
        view.recordMeasurement(measurement1, tagMap);
      }

      it('should have points', () => {
        const { timeseries } = view.getMetric(mockStartTime);
        assert.strictEqual(timeseries.length, 2);
        const [
          { labelValues: labelValues1, points: points1 },
          { labelValues: labelValues2, points: points2 },
        ] = timeseries;
        assert.ok(points1);

        let [point] = points1;
        let { timestamp, value } = point;
        assert.ok(timestamp);
        assert.strictEqual(typeof timestamp.nanos, 'number');
        assert.strictEqual(typeof timestamp.seconds, 'number');
        assert.strictEqual(timestamp.seconds, mockedTime.seconds);
        assert.strictEqual(timestamp.nanos, mockedTime.nanos);
        assert.notStrictEqual(typeof value, 'number');
        assert.deepStrictEqual(value as DistributionValue, {
          bucketOptions: { explicit: { bounds: buckets } },
          buckets: [{ count: 1 }, { count: 2 }, { count: 2 }, { count: 0 }],
          count: 5,
          sum: total,
          sumOfSquaredDeviation: 10.427999999999997,
        });
        assert.deepStrictEqual(labelValues1, [
          { value: 'testValue1' },
          { value: 'testValue2' },
        ]);
        assert.ok(points2);
        [point] = points2;
        ({ timestamp, value } = point);
        assert.ok(timestamp);
        assert.strictEqual(typeof timestamp.nanos, 'number');
        assert.strictEqual(typeof timestamp.seconds, 'number');
        assert.strictEqual(timestamp.seconds, mockedTime.seconds);
        assert.strictEqual(timestamp.nanos, mockedTime.nanos);
        assert.notStrictEqual(typeof value, 'number');
        assert.deepStrictEqual(value as DistributionValue, {
          bucketOptions: { explicit: { bounds: buckets } },
          buckets: [{ count: 1 }, { count: 2 }, { count: 2 }, { count: 0 }],
          count: 5,
          sum: total,
          sumOfSquaredDeviation: 10.427999999999997,
        });
        assert.deepStrictEqual(labelValues2, [
          { value: 'testValue3' },
          { value: 'testValue4' },
        ]);
      });
    });

    describe('COUNT aggregation type', () => {
      const view: View = new BaseView(
        'test/view/name',
        measure,
        AggregationType.COUNT,
        tagKeys,
        'description test',
        buckets
      );
      for (const value of measurementValues) {
        const measurement = { measure, value };
        view.recordMeasurement(measurement, tags);
      }

      it('should have point', () => {
        const { timeseries } = view.getMetric(mockStartTime);
        const [{ points, startTimestamp }] = timeseries;
        assert.ok(points);
        const [point] = points;
        const { timestamp, value } = point;
        assert.ok(timestamp);
        assert.strictEqual(typeof timestamp.nanos, 'number');
        assert.strictEqual(typeof timestamp.seconds, 'number');
        assert.strictEqual(timestamp.seconds, mockedTime.seconds);
        assert.strictEqual(timestamp.nanos, mockedTime.nanos);
        assert.strictEqual(typeof value, 'number');
        assert.strictEqual(value, 5);
        assert.deepStrictEqual(startTimestamp, mockStartTimestamp);
      });
    });

    describe('SUM aggregation type', () => {
      const view: View = new BaseView(
        'test/view/name',
        measure,
        AggregationType.SUM,
        tagKeys,
        'description test',
        buckets
      );
      let total = 0;
      for (const value of measurementValues) {
        total += value;
        const measurement = { measure, value };
        view.recordMeasurement(measurement, tags);
      }

      it('should have point', () => {
        const { timeseries } = view.getMetric(mockStartTime);
        const [{ points, startTimestamp }] = timeseries;
        assert.ok(points);
        const [point] = points;
        const { timestamp, value } = point;
        assert.ok(timestamp);
        assert.strictEqual(typeof timestamp.nanos, 'number');
        assert.strictEqual(typeof timestamp.seconds, 'number');
        assert.strictEqual(timestamp.seconds, mockedTime.seconds);
        assert.strictEqual(timestamp.nanos, mockedTime.nanos);
        assert.strictEqual(typeof value, 'number');
        assert.strictEqual(value, total);
        assert.deepStrictEqual(startTimestamp, mockStartTimestamp);
      });
    });

    describe('LAST_VALUE aggregation type', () => {
      const view: View = new BaseView(
        'test/view/name',
        measure,
        AggregationType.LAST_VALUE,
        tagKeys,
        'description test',
        buckets
      );
      for (const value of measurementValues) {
        const measurement = { measure, value };
        view.recordMeasurement(measurement, tags);
      }

      it('should have point', () => {
        const { timeseries } = view.getMetric(mockStartTime);
        const [{ points, startTimestamp }] = timeseries;
        assert.ok(points);
        const [point] = points;
        const { timestamp, value } = point;
        assert.strictEqual(timestamp.seconds, mockedTime.seconds);
        assert.strictEqual(timestamp.nanos, mockedTime.nanos);
        assert.strictEqual(typeof value, 'number');
        assert.strictEqual(
          value,
          measurementValues[measurementValues.length - 1]
        );
        assert.strictEqual(startTimestamp, undefined);
      });
    });
  });

  describe('getSnapshots()', () => {
    let view: View;
    const tagKey1 = { name: 'testKey1' };
    const tagKey2 = { name: 'testKey2' };
    const tagKeys = [tagKey1, tagKey2];
    const tagValue1 = { value: 'testValue1' };
    const tagValue2 = { value: 'testValue2' };

    const tags = new TagMap();
    tags.set(tagKey1, tagValue1);
    tags.set(tagKey2, tagValue2);

    before(() => {
      view = new BaseView(
        'test/view/name',
        measure,
        AggregationType.LAST_VALUE,
        tagKeys,
        'description test'
      );

      const measurement = { measure, value: 10 };
      view.recordMeasurement(measurement, tags);
    });

    it('should not get aggregation data when wrong tags values are given', () => {
      assert.ok(
        !view.getSnapshot([
          { value: 'wrongTagValue' },
          { value: 'wrongTagValue' },
        ])
      );
    });

    it('should not get aggregation data when not enough tags are given', () => {
      assert.ok(!view.getSnapshot([tagValue1]));
    });

    it('should get aggregation data when tags are correct', () => {
      assert.ok(view.getSnapshot([tagValue1, tagValue2]));
    });
  });
});
