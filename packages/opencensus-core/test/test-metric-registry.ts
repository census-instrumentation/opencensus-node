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
import {TEST_ONLY} from '../src/common/time-util';
import {LabelKey, LabelValue, MetricDescriptorType, Timestamp} from '../src/metrics/export/types';
import {MetricRegistry} from '../src/metrics/metric-registry';
import {MeasureUnit} from '../src/stats/types';

const METRIC_NAME = 'metric-name';
const METRIC_DESCRIPTION = 'metric-description';
const UNIT = MeasureUnit.UNIT;
const LABEL_KEYS: LabelKey[] = [{key: 'code', description: 'desc'}];
const LABEL_VALUES_200: LabelValue[] = [{value: '200'}];
const LABEL_VALUES_400: LabelValue[] = [{value: '400'}];
describe('addInt64Gauge', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = {seconds: 1450000100, nanos: 1e7};

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    const int64Gauge = registry.addInt64Gauge(
        METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    const pointEntry = int64Gauge.getOrCreateTimeSeries(LABEL_VALUES_200);
    pointEntry.add(100);

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{descriptor, timeseries}] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      'labelKeys': LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_INT64
    });
    assert.strictEqual(timeseries.length, 1);
    const [{points}] = timeseries;
    const [point] = points;
    assert.equal(point.value, 100);
    assert.deepStrictEqual(
        point.timestamp,
        {seconds: mockedTime.seconds, nanos: mockedTime.nanos});
  });
});

describe('addDoubleGauge', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = {seconds: 1450000100, nanos: 1e7};

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    const doubleGauge = registry.addDoubleGauge(
        METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    const pointEntry = doubleGauge.getOrCreateTimeSeries(LABEL_VALUES_200);
    pointEntry.add(5.5);

    const pointEntry1 = doubleGauge.getOrCreateTimeSeries(LABEL_VALUES_200);
    pointEntry1.set(0.7);

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{descriptor, timeseries}] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      'labelKeys': LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_DOUBLE
    });
    assert.strictEqual(timeseries.length, 1);
    const [{points}] = timeseries;
    const [point] = points;
    assert.equal(point.value, 0.7);
    assert.deepStrictEqual(
        point.timestamp,
        {seconds: mockedTime.seconds, nanos: mockedTime.nanos});
  });

  it('should throw an error when the register same metric', () => {
    registry.addDoubleGauge(METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    assert.throws(() => {
      registry.addDoubleGauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: A metric with the name metric-name has already been registered.$/);
  });
});

describe('addDerivedInt64Gauge', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = {seconds: 1450000100, nanos: 1e7};

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    const map = new Map();
    map.set('key', 'value');
    const derivedInt64Gauge = registry.addDerivedInt64Gauge(
        METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    derivedInt64Gauge.createTimeSeries(LABEL_VALUES_200, map);
    map.set('key1', 'value1');

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{descriptor, timeseries}] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      'labelKeys': LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_INT64
    });
    assert.strictEqual(timeseries.length, 1);
    const [{points}] = timeseries;
    const [point] = points;
    assert.equal(point.value, 2);
    assert.deepStrictEqual(
        point.timestamp,
        {seconds: mockedTime.seconds, nanos: mockedTime.nanos});
  });

  it('should throw an error when the register same metric', () => {
    registry.addDerivedInt64Gauge(
        METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    assert.throws(() => {
      registry.addDerivedInt64Gauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: A metric with the name metric-name has already been registered.$/);
  });
});

describe('addDerivedDoubleGauge', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = {seconds: 1450000100, nanos: 1e7};

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    class QueueManager {
      getValue(): number {
        return 0.7;
      }
    }
    const derivedDoubleGauge = registry.addDerivedDoubleGauge(
        METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    derivedDoubleGauge.createTimeSeries(LABEL_VALUES_200, new QueueManager());

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{descriptor, timeseries}] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      'labelKeys': LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_DOUBLE
    });
    assert.strictEqual(timeseries.length, 1);
    const [{points}] = timeseries;
    const [point] = points;
    assert.equal(point.value, 0.7);
    assert.deepStrictEqual(
        point.timestamp,
        {seconds: mockedTime.seconds, nanos: mockedTime.nanos});
  });

  it('should throw an error when the register same metric', () => {
    registry.addDerivedDoubleGauge(
        METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    assert.throws(() => {
      registry.addDerivedDoubleGauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: A metric with the name metric-name has already been registered.$/);
  });
});

describe('Add multiple gauges', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = {seconds: 1450000100, nanos: 1e7};

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return metrics', () => {
    const int64Gauge = registry.addInt64Gauge(
        'metric-name1', METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    int64Gauge.getOrCreateTimeSeries(LABEL_VALUES_200).add(100);

    const doubleGauge = registry.addDoubleGauge(
        'metric-name2', METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    doubleGauge.getOrCreateTimeSeries(LABEL_VALUES_200).add(5.5);

    const arr = new Array(5).fill('test');
    const derivedInt64Gauge = registry.addDerivedInt64Gauge(
        'metric-name3', METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    derivedInt64Gauge.createTimeSeries(LABEL_VALUES_400, {
      size: () => arr.length,
    });

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 3);
    const [{descriptor: descriptor1, timeseries: timeseries1}, {descriptor: descriptor2, timeseries: timeseries2}, {descriptor: descriptor3, timeseries: timeseries3}] = metrics;
    assert.deepStrictEqual(descriptor1, {
      name: 'metric-name1',
      description: METRIC_DESCRIPTION,
      'labelKeys': LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_INT64
    });
    assert.deepStrictEqual(descriptor2, {
      name: 'metric-name2',
      description: METRIC_DESCRIPTION,
      'labelKeys': LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_DOUBLE
    });
    assert.deepStrictEqual(descriptor3, {
      name: 'metric-name3',
      description: METRIC_DESCRIPTION,
      'labelKeys': LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_INT64
    });
    assert.strictEqual(timeseries1.length, 1);
    assert.strictEqual(timeseries1[0].points.length, 1);
    assert.equal(timeseries1[0].points[0].value, 100);
    assert.equal(
        timeseries1[0].points[0].timestamp.seconds, mockedTime.seconds);
    assert.equal(timeseries1[0].points[0].timestamp.nanos, mockedTime.nanos);
    assert.strictEqual(timeseries2.length, 1);
    assert.strictEqual(timeseries2[0].points.length, 1);
    assert.equal(timeseries2[0].points[0].value, 5.5);
    assert.strictEqual(timeseries3.length, 1);
    assert.strictEqual(timeseries3[0].points.length, 1);
    assert.equal(timeseries3[0].points[0].value, 5);
    assert.deepStrictEqual(
        timeseries1[0].points[0].timestamp, timeseries2[0].points[0].timestamp);
    assert.deepStrictEqual(
        timeseries2[0].points[0].timestamp, timeseries3[0].points[0].timestamp);
  });
});
