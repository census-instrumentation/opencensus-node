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

import { BaseView, MetricUtils } from '../src';
import { MetricDescriptorType } from '../src/metrics/export/types';
import {
  AggregationType,
  Measure,
  MeasureType,
  MeasureUnit,
} from '../src/stats/types';

describe('MetricUtil', () => {
  it('should convert view to MetricDescriptor', () => {
    const VIEW_DESCRIPTION = 'view description';
    const measure: Measure = {
      name: 'Test Measure',
      type: MeasureType.DOUBLE,
      unit: MeasureUnit.UNIT,
    };
    const tagKeys = [{ name: 'testKey1' }, { name: 'testKey2' }];
    const view = new BaseView(
      'test/view/name',
      measure,
      AggregationType.LAST_VALUE,
      tagKeys,
      VIEW_DESCRIPTION
    );
    const metricDescriptor = MetricUtils.viewToMetricDescriptor(view);

    assert.ok(metricDescriptor);
    assert.strictEqual(metricDescriptor.name, view.name);
    assert.strictEqual(metricDescriptor.unit, MeasureUnit.UNIT);
    assert.strictEqual(
      metricDescriptor.type,
      MetricDescriptorType.GAUGE_DOUBLE
    );
    assert.strictEqual(metricDescriptor.description, VIEW_DESCRIPTION);
    assert.deepStrictEqual(metricDescriptor.labelKeys, [
      { key: 'testKey1', description: '' },
      { key: 'testKey2', description: '' },
    ]);
  });

  it('should convert tag values to label values', () => {
    const tags = [
      { value: 'value1' },
      { value: 'value2' },
      { value: '' },
      null,
    ];
    assert.deepStrictEqual(MetricUtils.tagValuesToLabelValues(tags), [
      { value: 'value1' },
      { value: 'value2' },
      { value: '' },
      { value: null },
    ]);
  });

  it('should convert tag values to label values with null tag value', () => {
    const tags = [{ value: 'value1' }, null, null, null];
    assert.deepStrictEqual(MetricUtils.tagValuesToLabelValues(tags), [
      { value: 'value1' },
      { value: null },
      { value: null },
      { value: null },
    ]);
  });
});
