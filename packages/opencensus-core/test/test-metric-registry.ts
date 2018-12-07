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
import {LabelKey, LabelValue, MetricDescriptorType} from '../src/metrics/export/types';
import {MetricRegistry} from '../src/metrics/metric-registry';
import {MeasureUnit} from '../src/stats/types';

const METRIC_NAME = 'metric-name';
const METRIC_DESCRIPTION = 'metric-description';
const UNIT = MeasureUnit.UNIT;
const LABEL_KEYS: LabelKey[] = [{key: 'code', description: 'desc'}];
const LABEL_KEYS_WITH_NULL: LabelKey[] =
    [{key: 'code', description: 'desc'}, null];
const LABEL_VALUES_200: LabelValue[] = [{value: '200'}];

describe('addInt64Gauge', () => {
  const oldProcessHrtime = process.hrtime;
  let registry: MetricRegistry;

  beforeEach(() => {
    registry = new MetricRegistry();
    process.hrtime = () => [1000, 1e7];
  });

  afterEach(() => {
    process.hrtime = oldProcessHrtime;
  });

  it('should throw an error when the name is null', () => {
    assert.throws(() => {
      registry.addInt64Gauge(null, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory name parameter$/);
  });
  it('should throw an error when the name is undefined', () => {
    assert.throws(() => {
      registry.addInt64Gauge(undefined, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory name parameter$/);
  });
  it('should throw an error when the description is null', () => {
    assert.throws(() => {
      registry.addInt64Gauge(METRIC_NAME, null, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory description parameter$/);
  });
  it('should throw an error when the description is undefined', () => {
    assert.throws(() => {
      registry.addInt64Gauge(METRIC_NAME, undefined, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory description parameter$/);
  });
  it('should throw an error when the unit is null', () => {
    assert.throws(() => {
      registry.addInt64Gauge(METRIC_NAME, METRIC_DESCRIPTION, null, LABEL_KEYS);
    }, /^Error: Missing mandatory unit parameter$/);
  });
  it('should throw an error when the unit is undefined', () => {
    assert.throws(() => {
      registry.addInt64Gauge(
          METRIC_NAME, METRIC_DESCRIPTION, undefined, LABEL_KEYS);
    }, /^Error: Missing mandatory unit parameter$/);
  });
  it('should throw an error when the labelKeys is null', () => {
    assert.throws(() => {
      registry.addInt64Gauge(METRIC_NAME, METRIC_DESCRIPTION, UNIT, null);
    }, /^Error: Missing mandatory labelKeys parameter$/);
  });
  it('should throw an error when the labelKeys is undefined', () => {
    assert.throws(() => {
      registry.addInt64Gauge(METRIC_NAME, METRIC_DESCRIPTION, UNIT, undefined);
    }, /^Error: Missing mandatory labelKeys parameter$/);
  });
  it('should throw an error when the labelKey elements are NULL', () => {
    assert.throws(() => {
      registry.addInt64Gauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS_WITH_NULL);
    }, /^Error: labelKey elements should not be a NULL$/);
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
    assert.deepStrictEqual(point.timestamp, {seconds: 1000, nanos: 1e7});
  });
});

describe('addDoubleGauge', () => {
  const oldProcessHrtime = process.hrtime;
  let registry: MetricRegistry;

  beforeEach(() => {
    registry = new MetricRegistry();
    process.hrtime = () => [1000, 1e7];
  });

  afterEach(() => {
    process.hrtime = oldProcessHrtime;
  });

  it('should throw an error when the name is null', () => {
    assert.throws(() => {
      registry.addDoubleGauge(null, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory name parameter$/);
  });
  it('should throw an error when the name is undefined', () => {
    assert.throws(() => {
      registry.addDoubleGauge(undefined, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory name parameter$/);
  });
  it('should throw an error when the description is null', () => {
    assert.throws(() => {
      registry.addDoubleGauge(METRIC_NAME, null, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory description parameter$/);
  });
  it('should throw an error when the description is undefined', () => {
    assert.throws(() => {
      registry.addDoubleGauge(METRIC_NAME, undefined, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory description parameter$/);
  });
  it('should throw an error when the unit is null', () => {
    assert.throws(() => {
      registry.addDoubleGauge(
          METRIC_NAME, METRIC_DESCRIPTION, null, LABEL_KEYS);
    }, /^Error: Missing mandatory unit parameter$/);
  });
  it('should throw an error when the unit is undefined', () => {
    assert.throws(() => {
      registry.addDoubleGauge(
          METRIC_NAME, METRIC_DESCRIPTION, undefined, LABEL_KEYS);
    }, /^Error: Missing mandatory unit parameter$/);
  });
  it('should throw an error when the labelKeys is null', () => {
    assert.throws(() => {
      registry.addDoubleGauge(METRIC_NAME, METRIC_DESCRIPTION, UNIT, null);
    }, /^Error: Missing mandatory labelKeys parameter$/);
  });
  it('should throw an error when the labelKeys is undefined', () => {
    assert.throws(() => {
      registry.addDoubleGauge(METRIC_NAME, METRIC_DESCRIPTION, UNIT, undefined);
    }, /^Error: Missing mandatory labelKeys parameter$/);
  });
  it('should throw an error when the labelKey elements are NULL', () => {
    assert.throws(() => {
      registry.addDoubleGauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS_WITH_NULL);
    }, /^Error: labelKey elements should not be a NULL$/);
  });
  it('should return a metric', () => {
    const int64Gauge = registry.addDoubleGauge(
        METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    const pointEntry = int64Gauge.getOrCreateTimeSeries(LABEL_VALUES_200);
    pointEntry.add(5.5);

    const pointEntry1 = int64Gauge.getOrCreateTimeSeries(LABEL_VALUES_200);
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
    assert.deepStrictEqual(point.timestamp, {seconds: 1000, nanos: 1e7});
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
  const oldProcessHrtime = process.hrtime;
  let registry: MetricRegistry;

  beforeEach(() => {
    registry = new MetricRegistry();
    process.hrtime = () => [1000, 1e7];
  });

  afterEach(() => {
    process.hrtime = oldProcessHrtime;
  });

  it('should throw an error when the name is null', () => {
    assert.throws(() => {
      registry.addDerivedInt64Gauge(null, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory name parameter$/);
  });
  it('should throw an error when the name is undefined', () => {
    assert.throws(() => {
      registry.addDerivedInt64Gauge(
          undefined, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory name parameter$/);
  });
  it('should throw an error when the description is null', () => {
    assert.throws(() => {
      registry.addDerivedInt64Gauge(METRIC_NAME, null, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory description parameter$/);
  });
  it('should throw an error when the description is undefined', () => {
    assert.throws(() => {
      registry.addDerivedInt64Gauge(METRIC_NAME, undefined, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory description parameter$/);
  });
  it('should throw an error when the unit is null', () => {
    assert.throws(() => {
      registry.addDerivedInt64Gauge(
          METRIC_NAME, METRIC_DESCRIPTION, null, LABEL_KEYS);
    }, /^Error: Missing mandatory unit parameter$/);
  });
  it('should throw an error when the unit is undefined', () => {
    assert.throws(() => {
      registry.addDerivedInt64Gauge(
          METRIC_NAME, METRIC_DESCRIPTION, undefined, LABEL_KEYS);
    }, /^Error: Missing mandatory unit parameter$/);
  });
  it('should throw an error when the labelKeys is null', () => {
    assert.throws(() => {
      registry.addDerivedInt64Gauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, null);
    }, /^Error: Missing mandatory labelKeys parameter$/);
  });
  it('should throw an error when the labelKeys is undefined', () => {
    assert.throws(() => {
      registry.addDerivedInt64Gauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, undefined);
    }, /^Error: Missing mandatory labelKeys parameter$/);
  });
  it('should throw an error when the labelKey elements are NULL', () => {
    assert.throws(() => {
      registry.addDerivedInt64Gauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS_WITH_NULL);
    }, /^Error: labelKey elements should not be a NULL$/);
  });
});

describe('addDerivedDoubleGauge', () => {
  const oldProcessHrtime = process.hrtime;
  let registry: MetricRegistry;

  beforeEach(() => {
    registry = new MetricRegistry();
    process.hrtime = () => [1000, 1e7];
  });

  afterEach(() => {
    process.hrtime = oldProcessHrtime;
  });

  it('should throw an error when the name is null', () => {
    assert.throws(() => {
      registry.addDerivedDoubleGauge(
          null, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory name parameter$/);
  });
  it('should throw an error when the name is undefined', () => {
    assert.throws(() => {
      registry.addDerivedDoubleGauge(
          undefined, METRIC_DESCRIPTION, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory name parameter$/);
  });
  it('should throw an error when the description is null', () => {
    assert.throws(() => {
      registry.addDerivedDoubleGauge(METRIC_NAME, null, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory description parameter$/);
  });
  it('should throw an error when the description is undefined', () => {
    assert.throws(() => {
      registry.addDerivedDoubleGauge(METRIC_NAME, undefined, UNIT, LABEL_KEYS);
    }, /^Error: Missing mandatory description parameter$/);
  });
  it('should throw an error when the unit is null', () => {
    assert.throws(() => {
      registry.addDerivedDoubleGauge(
          METRIC_NAME, METRIC_DESCRIPTION, null, LABEL_KEYS);
    }, /^Error: Missing mandatory unit parameter$/);
  });
  it('should throw an error when the unit is undefined', () => {
    assert.throws(() => {
      registry.addDerivedDoubleGauge(
          METRIC_NAME, METRIC_DESCRIPTION, undefined, LABEL_KEYS);
    }, /^Error: Missing mandatory unit parameter$/);
  });
  it('should throw an error when the labelKeys is null', () => {
    assert.throws(() => {
      registry.addDerivedDoubleGauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, null);
    }, /^Error: Missing mandatory labelKeys parameter$/);
  });
  it('should throw an error when the labelKeys is undefined', () => {
    assert.throws(() => {
      registry.addDerivedDoubleGauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, undefined);
    }, /^Error: Missing mandatory labelKeys parameter$/);
  });
  it('should throw an error when the labelKey elements are NULL', () => {
    assert.throws(() => {
      registry.addDerivedDoubleGauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, LABEL_KEYS_WITH_NULL);
    }, /^Error: labelKey elements should not be a NULL$/);
  });
});
