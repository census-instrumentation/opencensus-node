/**
 * Copyright 2019, OpenCensus Authors
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
import { TEST_ONLY } from '../src/common/time-util';
import { Cumulative } from '../src/metrics/cumulative/cumulative';
import {
  LabelKey,
  LabelValue,
  MetricDescriptorType,
  Timestamp,
} from '../src/metrics/export/types';

const METRIC_NAME = 'metric-name';
const METRIC_DESCRIPTION = 'metric-description';
const UNIT = '1';
const CUMULATIVE_INT64 = MetricDescriptorType.CUMULATIVE_INT64;
const CUMULATIVE_DOUBLE = MetricDescriptorType.CUMULATIVE_DOUBLE;
const LABEL_KEYS: LabelKey[] = [{ key: 'code', description: 'desc' }];
const LABEL_VALUES_200: LabelValue[] = [{ value: '200' }];
const LABEL_VALUES_400: LabelValue[] = [{ value: '400' }];
const LABEL_VALUES_EXRTA: LabelValue[] = [{ value: '200' }, { value: '400' }];
const UNSET_LABEL_VALUE: LabelValue = {
  value: null,
};
const EMPTY_CONSTANT_LABELS = new Map();
const CONSTANT_LABELS = new Map();
CONSTANT_LABELS.set(
  { key: 'host', description: 'host' },
  { value: 'localhost' }
);

describe('CUMULATIVE', () => {
  let instance: Cumulative;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };
  const expectedMetricDescriptor = {
    name: METRIC_NAME,
    description: METRIC_DESCRIPTION,
    unit: UNIT,
    type: CUMULATIVE_INT64,
    labelKeys: LABEL_KEYS,
  };

  beforeEach(() => {
    instance = new Cumulative(
      METRIC_NAME,
      METRIC_DESCRIPTION,
      UNIT,
      CUMULATIVE_INT64,
      LABEL_KEYS,
      EMPTY_CONSTANT_LABELS
    );

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

  describe('getOrCreateTimeSeries()', () => {
    it('should return a Metric', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.inc();

      let metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [{ value: 1, timestamp: mockedTime }],
          startTimestamp: mockedTime,
        },
      ]);

      // inc value and create new timeseries.
      point.inc(5);
      const point1 = instance.getOrCreateTimeSeries(LABEL_VALUES_400);
      point1.inc();
      metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 2);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [{ value: 6, timestamp: mockedTime }],
          startTimestamp: mockedTime,
        },
        {
          labelValues: LABEL_VALUES_400,
          points: [{ value: 1, timestamp: mockedTime }],
          startTimestamp: mockedTime,
        },
      ]);
    });

    it('should throw an error when the keys and values dont have same size', () => {
      assert.throws(() => {
        instance.getOrCreateTimeSeries(LABEL_VALUES_EXRTA);
      }, /^Error: Label Keys and Label Values don't have same size$/);
    });

    it('should throw an error when the inc number is negative', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      assert.throws(() => {
        point.inc(-10);
      }, /^Error: It is not possible to decrease a cumulative metric$/);
    });

    it('should throw an error when the inc input is NaN', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      assert.throws(() => {
        point.inc(NaN);
      }, /^TypeError: Value is not a valid number: NaN$/);
    });

    it('should throw a TypeError when the inc number is not finite', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      assert.throws(() => {
        point.inc(100 / 0);
      }, /^TypeError: Value is not a valid number: Infinity$/);
    });

    it('should reset the point value', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.inc(10);
      point.reset();
      point.inc();
      const metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [{ value: 1, timestamp: mockedTime }],
          startTimestamp: mockedTime,
        },
      ]);
    });

    it('should not create same timeseries again', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.inc(10);
      let metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [{ value: 10, timestamp: mockedTime }],
          startTimestamp: mockedTime,
        },
      ]);
      // create timeseries with same labels.
      const point1 = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point1.inc(30);
      metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [{ value: 40, timestamp: mockedTime }],
          startTimestamp: mockedTime,
        },
      ]);
    });
  });

  describe('getDefaultTimeSeries()', () => {
    it('should create new default timeseries', () => {
      const point = instance.getDefaultTimeSeries();
      point.inc(10);

      // @ts-expect-error ts-migrate(2741) FIXME: Property 'bigint' is missing in type '() => [numbe... Remove this comment to see the full error message
      process.hrtime = () => [100, 1e7];
      Date.now = () => 1480000000000;
      // Force the clock to recalibrate the time offset with the mocked time
      TEST_ONLY.setHrtimeReference();

      const metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: [UNSET_LABEL_VALUE],
          points: [
            { value: 10, timestamp: { seconds: 1480000100, nanos: 1e7 } },
          ],
          startTimestamp: mockedTime,
        },
      ]);
    });

    it('should return same timeseries for interchanged labels', () => {
      instance = new Cumulative(
        METRIC_NAME,
        METRIC_DESCRIPTION,
        UNIT,
        CUMULATIVE_INT64,
        [
          { key: 'k1', description: 'desc' },
          { key: 'k2', description: 'desc' },
        ],
        EMPTY_CONSTANT_LABELS
      );
      const point = instance.getOrCreateTimeSeries([
        { value: '200' },
        { value: '400' },
      ]);
      point.inc(200);
      const point1 = instance.getOrCreateTimeSeries([
        { value: '400' },
        { value: '200' },
      ]);
      point1.inc(400);
      const metric = instance.getMetric();
      assert.strictEqual(metric!.timeseries.length, 1);
    });

    it('should add constant labels', () => {
      instance = new Cumulative(
        METRIC_NAME,
        METRIC_DESCRIPTION,
        UNIT,
        CUMULATIVE_DOUBLE,
        [
          { key: 'k1', description: 'desc' },
          { key: 'k2', description: 'desc' },
        ],
        CONSTANT_LABELS
      );
      const point = instance.getOrCreateTimeSeries([
        { value: '200' },
        { value: '400' },
      ]);
      point.inc(200);
      const metric = instance.getMetric();
      assert.strictEqual(metric!.descriptor.type, 5);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.descriptor.labelKeys, [
        { key: 'k1', description: 'desc' },
        { key: 'k2', description: 'desc' },
        { key: 'host', description: 'host' },
      ]);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: [
            { value: '200' },
            { value: '400' },
            { value: 'localhost' },
          ],
          points: [{ value: 200, timestamp: mockedTime }],
          startTimestamp: mockedTime,
        },
      ]);
    });

    it('should create same labelValues as labelKeys', () => {
      instance = new Cumulative(
        METRIC_NAME,
        METRIC_DESCRIPTION,
        UNIT,
        CUMULATIVE_DOUBLE,
        [
          { key: 'k1', description: 'desc' },
          { key: 'k2', description: 'desc' },
          { key: 'k3', description: 'desc' },
        ],
        EMPTY_CONSTANT_LABELS
      );
      const point = instance.getDefaultTimeSeries();
      point.inc(200);
      const metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor.labelKeys.length, 3);
      assert.deepStrictEqual(metric!.descriptor.type, 5);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: [
            UNSET_LABEL_VALUE,
            UNSET_LABEL_VALUE,
            UNSET_LABEL_VALUE,
          ],
          points: [{ value: 200, timestamp: mockedTime }],
          startTimestamp: mockedTime,
        },
      ]);
    });

    it('should use previously created default timeseries', () => {
      const point = instance.getDefaultTimeSeries();
      point.inc(300);
      let metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: [UNSET_LABEL_VALUE],
          points: [{ value: 300, timestamp: mockedTime }],
          startTimestamp: mockedTime,
        },
      ]);
      // get default timeseries again.
      const point1 = instance.getDefaultTimeSeries();
      point1.inc(400);
      metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: [UNSET_LABEL_VALUE],
          points: [{ value: 700, timestamp: mockedTime }],
          startTimestamp: mockedTime,
        },
      ]);
    });
  });

  describe('removeTimeSeries()', () => {
    it('should remove TimeSeries', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.inc(10);
      let metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      instance.removeTimeSeries(LABEL_VALUES_200);
      metric = instance.getMetric();
      assert.deepStrictEqual(metric, null);
    });
  });

  describe('clear()', () => {
    it('should clear all TimeSeries', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.inc(10);
      const point1 = instance.getOrCreateTimeSeries(LABEL_VALUES_400);
      point1.inc(10);
      let metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 2);
      instance.clear();
      metric = instance.getMetric();
      assert.deepStrictEqual(metric, null);
    });
  });
});
