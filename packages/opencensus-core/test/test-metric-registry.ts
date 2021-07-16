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
import { MetricRegistry } from '../src/metrics/metric-registry';
import { MeasureUnit } from '../src/stats/types';

const METRIC_NAME = 'metric-name';
const METRIC_DESCRIPTION = 'metric-description';
const UNIT = MeasureUnit.UNIT;
const LABEL_KEYS: LabelKey[] = [{ key: 'code', description: 'desc' }];
const LABEL_VALUES_200: LabelValue[] = [{ value: '200' }];
const LABEL_VALUES_400: LabelValue[] = [{ value: '400' }];

const METRIC_OPTIONS = {
  description: METRIC_DESCRIPTION,
  unit: UNIT,
  labelKeys: LABEL_KEYS,
};

describe('addInt64Gauge', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    const int64Gauge = registry.addInt64Gauge(METRIC_NAME, METRIC_OPTIONS);
    const pointEntry = int64Gauge.getOrCreateTimeSeries(LABEL_VALUES_200);
    pointEntry.add(100);

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_INT64,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 100);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });

  it('should return a metric without options', () => {
    const int64Gauge = registry.addInt64Gauge(METRIC_NAME);
    const pointEntry = int64Gauge.getDefaultTimeSeries();
    pointEntry.add(100);

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: '',
      labelKeys: [],
      unit: '1',
      type: MetricDescriptorType.GAUGE_INT64,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 100);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });

  it('should throw an error when the duplicate keys in labelKeys and constantLabels', () => {
    const constantLabels = new Map();
    constantLabels.set({ key: 'k1' }, { value: 'v1' });
    const labelKeys = [{ key: 'k1', description: 'desc' }];
    assert.throws(() => {
      registry.addInt64Gauge(METRIC_NAME, { constantLabels, labelKeys });
    }, /^Error: The keys from LabelKeys should not be present in constantLabels or LabelKeys should not contains duplicate keys$/);
  });
});

describe('addDoubleGauge', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    const doubleGauge = registry.addDoubleGauge(METRIC_NAME, METRIC_OPTIONS);
    const pointEntry = doubleGauge.getOrCreateTimeSeries(LABEL_VALUES_200);
    pointEntry.add(5.5);

    const pointEntry1 = doubleGauge.getOrCreateTimeSeries(LABEL_VALUES_200);
    pointEntry1.set(0.7);

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_DOUBLE,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 0.7);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });

  it('should throw an error when the register same metric', () => {
    registry.addDoubleGauge(METRIC_NAME, METRIC_OPTIONS);
    assert.throws(() => {
      registry.addDoubleGauge(METRIC_NAME, METRIC_OPTIONS);
    }, /^Error: A metric with the name metric-name has already been registered.$/);
  });

  it('should throw an error when the constant labels elements are null', () => {
    let constantLabels = new Map();
    constantLabels.set({ key: 'k1' }, null);
    assert.throws(() => {
      registry.addDoubleGauge(METRIC_NAME, { constantLabels });
    }, /^Error: constantLabels elements should not be a NULL$/);

    constantLabels = new Map();
    constantLabels.set(null, null);
    assert.throws(() => {
      registry.addDoubleGauge(METRIC_NAME, { constantLabels });
    }, /^Error: constantLabels elements should not be a NULL$/);
  });

  it('should return a metric without options', () => {
    const doubleGauge = registry.addDoubleGauge(METRIC_NAME);
    const pointEntry = doubleGauge.getDefaultTimeSeries();
    pointEntry.add(5.5);

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: '',
      labelKeys: [],
      unit: '1',
      type: MetricDescriptorType.GAUGE_DOUBLE,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 5.5);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });
});

describe('addDerivedInt64Gauge', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    const map = new Map();
    map.set('key', 'value');
    const derivedInt64Gauge = registry.addDerivedInt64Gauge(
      METRIC_NAME,
      METRIC_OPTIONS
    );
    derivedInt64Gauge.createTimeSeries(LABEL_VALUES_200, map);
    map.set('key1', 'value1');

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_INT64,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 2);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });

  it('should throw an error when the register same metric', () => {
    registry.addDerivedInt64Gauge(METRIC_NAME, METRIC_OPTIONS);
    assert.throws(() => {
      registry.addDerivedInt64Gauge(METRIC_NAME, METRIC_OPTIONS);
    }, /^Error: A metric with the name metric-name has already been registered.$/);
  });

  it('should throw an error when the duplicate keys in labelKeys and constantLabels', () => {
    const constantLabels = new Map();
    constantLabels.set({ key: 'k1' }, { value: 'v1' });
    const labelKeys = [{ key: 'k1', description: 'desc' }];
    assert.throws(() => {
      registry.addDerivedInt64Gauge(METRIC_NAME, { constantLabels, labelKeys });
    }, /^Error: The keys from LabelKeys should not be present in constantLabels or LabelKeys should not contains duplicate keys$/);
  });

  it('should throw an error when the constant labels elements are null', () => {
    const constantLabels = new Map();
    constantLabels.set({ key: 'k1' }, null);
    assert.throws(() => {
      registry.addDerivedInt64Gauge(METRIC_NAME, { constantLabels });
    }, /^Error: constantLabels elements should not be a NULL$/);
  });

  it('should return a metric without options', () => {
    const map = new Map();
    map.set('key', 'value');
    const derivedInt64Gauge = registry.addDerivedInt64Gauge(METRIC_NAME);
    derivedInt64Gauge.createTimeSeries([], map);
    map.set('key1', 'value1');

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: '',
      labelKeys: [],
      unit: '1',
      type: MetricDescriptorType.GAUGE_INT64,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 2);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });
});

describe('addDerivedDoubleGauge', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    class QueueManager {
      getValue(): number {
        return 0.7;
      }
    }
    const derivedDoubleGauge = registry.addDerivedDoubleGauge(
      METRIC_NAME,
      METRIC_OPTIONS
    );
    derivedDoubleGauge.createTimeSeries(LABEL_VALUES_200, new QueueManager());

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_DOUBLE,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 0.7);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });

  it('should throw an error when the register same metric', () => {
    registry.addDerivedDoubleGauge(METRIC_NAME, METRIC_OPTIONS);
    assert.throws(() => {
      registry.addDerivedDoubleGauge(METRIC_NAME, METRIC_OPTIONS);
    }, /^Error: A metric with the name metric-name has already been registered.$/);
  });
});

describe('addInt64Cumulative', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    const int64Gauge = registry.addInt64Cumulative(METRIC_NAME, METRIC_OPTIONS);
    const pointEntry = int64Gauge.getOrCreateTimeSeries(LABEL_VALUES_200);
    pointEntry.inc();

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.CUMULATIVE_INT64,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 1);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });

  it('should return a metric without options', () => {
    const int64Gauge = registry.addInt64Cumulative(METRIC_NAME);
    const pointEntry = int64Gauge.getDefaultTimeSeries();
    pointEntry.inc(100);

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: '',
      labelKeys: [],
      unit: UNIT,
      type: MetricDescriptorType.CUMULATIVE_INT64,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 100);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });

  it('should throw an error when the duplicate keys in labelKeys and constantLabels', () => {
    const constantLabels = new Map();
    constantLabels.set({ key: 'k1' }, { value: 'v1' });
    const labelKeys = [{ key: 'k1', description: 'desc' }];
    assert.throws(() => {
      registry.addInt64Cumulative(METRIC_NAME, { constantLabels, labelKeys });
    }, /^Error: The keys from LabelKeys should not be present in constantLabels or LabelKeys should not contains duplicate keys$/);
  });
});

describe('addDoubleCumulative', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    const int64Gauge = registry.addDoubleCumulative(
      METRIC_NAME,
      METRIC_OPTIONS
    );
    const pointEntry = int64Gauge.getOrCreateTimeSeries(LABEL_VALUES_200);
    pointEntry.inc(1.1);

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.CUMULATIVE_DOUBLE,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 1.1);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });

  it('should return a metric without options', () => {
    const int64Gauge = registry.addDoubleCumulative(METRIC_NAME);
    const pointEntry = int64Gauge.getDefaultTimeSeries();
    pointEntry.inc();
    pointEntry.inc(100.12);

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: '',
      labelKeys: [],
      unit: UNIT,
      type: MetricDescriptorType.CUMULATIVE_DOUBLE,
    });
    assert.strictEqual(timeseries.length, 1);
    const [{ points }] = timeseries;
    const [point] = points;
    assert.strictEqual(point.value, 101.12);
    assert.deepStrictEqual(point.timestamp, {
      seconds: mockedTime.seconds,
      nanos: mockedTime.nanos,
    });
  });

  it('should throw an error when the duplicate keys in labelKeys and constantLabels', () => {
    const constantLabels = new Map();
    constantLabels.set({ key: 'k1' }, { value: 'v1' });
    const labelKeys = [{ key: 'k1', description: 'desc' }];
    assert.throws(() => {
      registry.addDoubleCumulative(METRIC_NAME, { constantLabels, labelKeys });
    }, /^Error: The keys from LabelKeys should not be present in constantLabels or LabelKeys should not contains duplicate keys$/);
  });
});

describe('addDerivedInt64Cumulative', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    const map = new Map();
    map.set('key', 'value');
    const derivedInt64Cumulative = registry.addDerivedInt64Cumulative(
      METRIC_NAME,
      METRIC_OPTIONS
    );
    derivedInt64Cumulative.createTimeSeries(LABEL_VALUES_200, map);
    map.set('key1', 'value1');

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.CUMULATIVE_INT64,
    });
    assert.strictEqual(timeseries.length, 1);
    assert.deepStrictEqual(timeseries, [
      {
        labelValues: LABEL_VALUES_200,
        points: [{ value: 2, timestamp: mockedTime }],
        startTimestamp: mockedTime,
      },
    ]);
  });

  it('should throw an error when the register same metric', () => {
    registry.addDerivedInt64Cumulative(METRIC_NAME, METRIC_OPTIONS);
    assert.throws(() => {
      registry.addDerivedInt64Cumulative(METRIC_NAME, METRIC_OPTIONS);
    }, /^Error: A metric with the name metric-name has already been registered.$/);
  });

  it('should throw an error when the duplicate keys in labelKeys and constantLabels', () => {
    const constantLabels = new Map();
    constantLabels.set({ key: 'k1' }, { value: 'v1' });
    const labelKeys = [{ key: 'k1', description: 'desc' }];
    assert.throws(() => {
      registry.addDerivedInt64Cumulative(METRIC_NAME, {
        constantLabels,
        labelKeys,
      });
    }, /^Error: The keys from LabelKeys should not be present in constantLabels or LabelKeys should not contains duplicate keys$/);
  });

  it('should throw an error when the constant labels elements are null', () => {
    const constantLabels = new Map();
    constantLabels.set({ key: 'k1' }, null);
    assert.throws(() => {
      registry.addDerivedInt64Cumulative(METRIC_NAME, { constantLabels });
    }, /^Error: constantLabels elements should not be a NULL$/);
  });

  it('should return a metric without options', () => {
    const map = new Map();
    map.set('key', 'value');
    const derivedInt64Cumulative = registry.addDerivedInt64Cumulative(
      METRIC_NAME
    );
    derivedInt64Cumulative.createTimeSeries([], map);
    map.set('key1', 'value1');

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: '',
      labelKeys: [],
      unit: '1',
      type: MetricDescriptorType.CUMULATIVE_INT64,
    });
    assert.strictEqual(timeseries.length, 1);
    assert.deepStrictEqual(timeseries, [
      {
        labelValues: [],
        points: [{ value: 2, timestamp: mockedTime }],
        startTimestamp: mockedTime,
      },
    ]);
  });
});

describe('addDerivedDoubleCumulative', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return a metric', () => {
    class QueueManager {
      get Value(): number {
        return 45.5;
      }
    }
    const queue = new QueueManager();
    const derivedDoubleCumulative = registry.addDerivedDoubleCumulative(
      METRIC_NAME,
      METRIC_OPTIONS
    );
    derivedDoubleCumulative.createTimeSeries(LABEL_VALUES_200, () => {
      return queue.Value;
    });

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.CUMULATIVE_DOUBLE,
    });
    assert.strictEqual(timeseries.length, 1);
    assert.deepStrictEqual(timeseries, [
      {
        labelValues: LABEL_VALUES_200,
        points: [{ value: 45.5, timestamp: mockedTime }],
        startTimestamp: mockedTime,
      },
    ]);
  });

  it('should throw an error when the register same metric', () => {
    registry.addDerivedDoubleCumulative(METRIC_NAME, METRIC_OPTIONS);
    assert.throws(() => {
      registry.addDerivedDoubleCumulative(METRIC_NAME, METRIC_OPTIONS);
    }, /^Error: A metric with the name metric-name has already been registered.$/);
  });

  it('should throw an error when the duplicate keys in labelKeys and constantLabels', () => {
    const constantLabels = new Map();
    constantLabels.set({ key: 'k1' }, { value: 'v1' });
    const labelKeys = [{ key: 'k1', description: 'desc' }];
    assert.throws(() => {
      registry.addDerivedDoubleCumulative(METRIC_NAME, {
        constantLabels,
        labelKeys,
      });
    }, /^Error: The keys from LabelKeys should not be present in constantLabels or LabelKeys should not contains duplicate keys$/);
  });

  it('should throw an error when the constant labels elements are null', () => {
    const constantLabels = new Map();
    constantLabels.set({ key: 'k1' }, null);
    assert.throws(() => {
      registry.addDerivedDoubleCumulative(METRIC_NAME, { constantLabels });
    }, /^Error: constantLabels elements should not be a NULL$/);
  });

  it('should return a metric without options', () => {
    class MemoryInfo {
      current = 45.5;
      get Value(): number {
        return this.current;
      }
      inc() {
        this.current++;
      }
    }
    const mem = new MemoryInfo();
    const derivedDoubleCumulative = registry.addDerivedDoubleCumulative(
      METRIC_NAME
    );
    derivedDoubleCumulative.createTimeSeries([], () => {
      return mem.Value;
    });
    mem.inc();

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 1);
    const [{ descriptor, timeseries }] = metrics;
    assert.deepStrictEqual(descriptor, {
      name: METRIC_NAME,
      description: '',
      labelKeys: [],
      unit: '1',
      type: MetricDescriptorType.CUMULATIVE_DOUBLE,
    });
    assert.strictEqual(timeseries.length, 1);
    assert.deepStrictEqual(timeseries, [
      {
        labelValues: [],
        points: [{ value: 46.5, timestamp: mockedTime }],
        startTimestamp: mockedTime,
      },
    ]);
  });
});

describe('Add multiple gauges', () => {
  let registry: MetricRegistry;
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;
  const mockedTime: Timestamp = { seconds: 1450000100, nanos: 1e7 };

  beforeEach(() => {
    registry = new MetricRegistry();

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

  it('should return metrics', () => {
    const int64Gauge = registry.addInt64Gauge('metric-name1', METRIC_OPTIONS);
    int64Gauge.getOrCreateTimeSeries(LABEL_VALUES_200).add(100);

    const doubleGauge = registry.addDoubleGauge('metric-name2', METRIC_OPTIONS);
    doubleGauge.getOrCreateTimeSeries(LABEL_VALUES_200).add(5.5);

    const arr = new Array(5).fill('test');
    const derivedInt64Gauge = registry.addDerivedInt64Gauge(
      'metric-name3',
      METRIC_OPTIONS
    );
    derivedInt64Gauge.createTimeSeries(LABEL_VALUES_400, {
      size: () => arr.length,
    });

    const int64Cumulative = registry.addInt64Cumulative(
      'metric-name4',
      METRIC_OPTIONS
    );
    int64Cumulative.getOrCreateTimeSeries(LABEL_VALUES_200).inc();

    const metrics = registry.getMetricProducer().getMetrics();
    assert.strictEqual(metrics.length, 4);
    const [
      { descriptor: descriptor1, timeseries: timeseries1 },
      { descriptor: descriptor2, timeseries: timeseries2 },
      { descriptor: descriptor3, timeseries: timeseries3 },
      { descriptor: descriptor4, timeseries: timeseries4 },
    ] = metrics;
    assert.deepStrictEqual(descriptor1, {
      name: 'metric-name1',
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_INT64,
    });
    assert.deepStrictEqual(descriptor2, {
      name: 'metric-name2',
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_DOUBLE,
    });
    assert.deepStrictEqual(descriptor3, {
      name: 'metric-name3',
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.GAUGE_INT64,
    });
    assert.deepStrictEqual(descriptor4, {
      name: 'metric-name4',
      description: METRIC_DESCRIPTION,
      labelKeys: LABEL_KEYS,
      unit: UNIT,
      type: MetricDescriptorType.CUMULATIVE_INT64,
    });
    assert.strictEqual(timeseries1.length, 1);
    assert.strictEqual(timeseries1[0].points.length, 1);
    assert.strictEqual(timeseries1[0].points[0].value, 100);
    assert.strictEqual(
      timeseries1[0].points[0].timestamp.seconds,
      mockedTime.seconds
    );
    assert.strictEqual(
      timeseries1[0].points[0].timestamp.nanos,
      mockedTime.nanos
    );
    assert.strictEqual(timeseries2.length, 1);
    assert.strictEqual(timeseries2[0].points.length, 1);
    assert.strictEqual(timeseries2[0].points[0].value, 5.5);
    assert.strictEqual(timeseries3.length, 1);
    assert.strictEqual(timeseries3[0].points.length, 1);
    assert.strictEqual(timeseries3[0].points[0].value, 5);
    assert.deepStrictEqual(
      timeseries1[0].points[0].timestamp,
      timeseries2[0].points[0].timestamp
    );
    assert.deepStrictEqual(
      timeseries2[0].points[0].timestamp,
      timeseries3[0].points[0].timestamp
    );
    assert.strictEqual(timeseries4.length, 1);
    assert.strictEqual(timeseries4[0].points.length, 1);
    assert.strictEqual(timeseries4[0].points[0].value, 1);
  });
});
