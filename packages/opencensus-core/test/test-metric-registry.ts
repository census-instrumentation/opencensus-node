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
import {LabelKey} from '../src/metrics/export/types';
import {MetricRegistry} from '../src/metrics/metric-registry';
import {MeasureUnit} from '../src/stats/types';

const METRIC_NAME = 'metric-name';
const METRIC_DESCRIPTION = 'metric-description';
const UNIT = MeasureUnit.UNIT;
const LABEL_KEYS: LabelKey[] = [{key: 'code', description: 'desc'}];
const LABEL_KEYS_WITH_NULL: LabelKey[] =
    [{key: 'code', description: 'desc'}, null];

const registry = new MetricRegistry();

describe('addInt64Gauge', () => {
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
});

describe('addDoubleGauge', () => {
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
});

describe('addDerivedInt64Gauge', () => {
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
