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
import { TEST_ONLY } from '../src/common/time-util';
import {
  LabelKey,
  LabelValue,
  MetricDescriptorType,
  Timestamp,
} from '../src/metrics/export/types';
import { DerivedGauge } from '../src/metrics/gauges/derived-gauge';

const METRIC_NAME = 'metric-name';
const METRIC_DESCRIPTION = 'metric-description';
const UNIT = '1';
const GAUGE_INT64 = MetricDescriptorType.GAUGE_INT64;
const GAUGE_DOUBLE = MetricDescriptorType.GAUGE_DOUBLE;
const LABEL_KEYS: LabelKey[] = [{ key: 'code', description: 'desc' }];
const LABEL_VALUES_200: LabelValue[] = [{ value: '200' }];
const LABEL_VALUES_400: LabelValue[] = [{ value: '400' }];
const LABEL_VALUES_EXRTA: LabelValue[] = [{ value: '200' }, { value: '400' }];
const EMPTY_CONSTANT_LABELS = new Map();
const CONSTANT_LABELS = new Map();
CONSTANT_LABELS.set(
  { key: 'host', description: 'host' },
  { value: 'localhost' }
);

describe('DerivedGauge', () => {
  let instance: DerivedGauge;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };
  const expectedMetricDescriptor = {
    name: METRIC_NAME,
    description: METRIC_DESCRIPTION,
    unit: UNIT,
    type: GAUGE_INT64,
    labelKeys: LABEL_KEYS,
  };

  beforeEach(() => {
    instance = new DerivedGauge(
      METRIC_NAME,
      METRIC_DESCRIPTION,
      UNIT,
      GAUGE_INT64,
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

  describe('createTimeSeries()', () => {
    it('should throw an error when the keys and values dont have same size', () => {
      assert.throws(() => {
        instance.createTimeSeries(LABEL_VALUES_EXRTA, new Map());
      }, /^Error: Label Keys and Label Values don't have same size$/);
    });
    it('should return a Metric', () => {
      const map = new Map();
      map.set('key', 'value');
      instance.createTimeSeries(LABEL_VALUES_200, map);
      map.set('key1', 'value1');

      let metric = instance.getMetric();
      assert.notStrictEqual(metric, null);
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [
            {
              value: 2,
              timestamp: {
                nanos: mockedTime.nanos,
                seconds: mockedTime.seconds,
              },
            },
          ],
        },
      ]);
      // add data in collection
      map.set('key2', 'value2');
      map.set('key3', 'value3');

      // add new timeseries with length-method
      const arr = new Array(5).fill('test');
      instance.createTimeSeries(LABEL_VALUES_400, {
        size: () => arr.length,
      });

      metric = instance.getMetric();
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 2);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [
            {
              value: 4,
              timestamp: {
                nanos: mockedTime.nanos,
                seconds: mockedTime.seconds,
              },
            },
          ],
        },
        {
          labelValues: LABEL_VALUES_400,
          points: [
            {
              value: 5,
              timestamp: {
                nanos: mockedTime.nanos,
                seconds: mockedTime.seconds,
              },
            },
          ],
        },
      ]);
    });
    it('should return a Metric (INT64) - custom object', () => {
      class QueueManager {
        getValue(): number {
          return 45;
        }
      }
      const obj = new QueueManager();
      instance.createTimeSeries(LABEL_VALUES_200, obj);
      const metric = instance.getMetric();
      assert.notStrictEqual(metric, null);
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [
            {
              value: 45,
              timestamp: {
                nanos: mockedTime.nanos,
                seconds: mockedTime.seconds,
              },
            },
          ],
        },
      ]);
    });

    it('should return a Metric value from a function', () => {
      class QueueManager {
        private depth = 0;
        get pendingJobs() {
          return this.depth;
        }
        addJob() {
          this.depth++;
        }
      }
      const queue = new QueueManager();
      queue.addJob();
      instance.createTimeSeries(LABEL_VALUES_200, () => {
        return queue.pendingJobs;
      });

      let metric = instance.getMetric();
      assert.notStrictEqual(metric, null);
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [
            {
              value: 1,
              timestamp: {
                nanos: mockedTime.nanos,
                seconds: mockedTime.seconds,
              },
            },
          ],
        },
      ]);
      // Simulate a adding multiple jobs in queue
      queue.addJob();
      queue.addJob();
      queue.addJob();
      metric = instance.getMetric();
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries[0].points, [
        {
          value: 4,
          timestamp: { nanos: mockedTime.nanos, seconds: mockedTime.seconds },
        },
      ]);
    });

    it('should return a Metric (Double) - custom object', () => {
      class QueueManager {
        getValue(): number {
          return 0.7;
        }
      }
      const obj = new QueueManager();
      const doubleInstance = new DerivedGauge(
        METRIC_NAME,
        METRIC_DESCRIPTION,
        UNIT,
        GAUGE_DOUBLE,
        LABEL_KEYS,
        EMPTY_CONSTANT_LABELS
      );
      doubleInstance.createTimeSeries(LABEL_VALUES_200, obj);
      const metric = doubleInstance.getMetric();
      assert.notStrictEqual(metric, null);
      assert.deepStrictEqual(metric!.descriptor, {
        name: METRIC_NAME,
        description: METRIC_DESCRIPTION,
        unit: UNIT,
        type: GAUGE_DOUBLE,
        labelKeys: LABEL_KEYS,
      });
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [
            {
              value: 0.7,
              timestamp: {
                nanos: mockedTime.nanos,
                seconds: mockedTime.seconds,
              },
            },
          ],
        },
      ]);
    });

    it('should return a Metric (Double) - custom object', () => {
      class QueueManager {
        getValue(): number {
          return 0.7;
        }
      }
      const obj = new QueueManager();
      const doubleInstance = new DerivedGauge(
        METRIC_NAME,
        METRIC_DESCRIPTION,
        UNIT,
        GAUGE_DOUBLE,
        LABEL_KEYS,
        CONSTANT_LABELS
      );
      doubleInstance.createTimeSeries(LABEL_VALUES_200, obj);
      const metric = doubleInstance.getMetric();
      assert.notStrictEqual(metric, null);
      assert.deepStrictEqual(metric!.descriptor, {
        name: METRIC_NAME,
        description: METRIC_DESCRIPTION,
        unit: UNIT,
        type: GAUGE_DOUBLE,
        labelKeys: [...LABEL_KEYS, ...Array.from(CONSTANT_LABELS.keys())],
      });
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: [
            ...LABEL_VALUES_200,
            ...Array.from(CONSTANT_LABELS.values()),
          ],
          points: [
            {
              value: 0.7,
              timestamp: {
                nanos: mockedTime.nanos,
                seconds: mockedTime.seconds,
              },
            },
          ],
        },
      ]);
    });

    it('should not create same timeseries again', () => {
      const map = new Map();
      instance.createTimeSeries(LABEL_VALUES_200, map);
      map.set('key', 'value');
      const metric = instance.getMetric();
      assert.notStrictEqual(metric, null);
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 1);
      assert.deepStrictEqual(metric!.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [
            {
              value: 1,
              timestamp: {
                nanos: mockedTime.nanos,
                seconds: mockedTime.seconds,
              },
            },
          ],
        },
      ]);

      // create timeseries with same labels.
      assert.throws(() => {
        instance.createTimeSeries(LABEL_VALUES_200, map);
      }, /^Error: A different time series with the same labels already exists.$/);
    });
  });
  describe('removeTimeSeries()', () => {
    it('should remove TimeSeries', () => {
      const arr: string[] = [];
      instance.createTimeSeries(LABEL_VALUES_200, arr);
      arr.push('test');
      let metric = instance.getMetric();
      assert.notStrictEqual(metric, null);
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      instance.removeTimeSeries(LABEL_VALUES_200);
      metric = instance.getMetric();
      assert.deepStrictEqual(metric, null);
    });
  });
  describe('clear()', () => {
    it('should clear all TimeSeries', () => {
      const map = new Map();
      instance.createTimeSeries(LABEL_VALUES_200, {
        size: () => map.size,
      });
      map.set('key', 'value');

      const arr: string[] = [];
      instance.createTimeSeries(LABEL_VALUES_400, {
        size: () => arr.length,
      });
      arr.push('test');
      let metric = instance.getMetric();
      assert.notStrictEqual(metric, null);
      assert.deepStrictEqual(metric!.descriptor, expectedMetricDescriptor);
      assert.strictEqual(metric!.timeseries.length, 2);
      instance.clear();
      metric = instance.getMetric();
      assert.deepStrictEqual(metric, null);
    });
  });
});
