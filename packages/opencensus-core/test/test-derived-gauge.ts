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
import {DerivedGauge} from '../src/metrics/gauges/derived-gauge';

const METRIC_NAME = 'metric-name';
const METRIC_DESCRIPTION = 'metric-description';
const UNIT = '1';
const GAUGE_INT64 = MetricDescriptorType.GAUGE_INT64;
const GAUGE_DOUBLE = MetricDescriptorType.GAUGE_DOUBLE;
const LABEL_KEYS: LabelKey[] = [{key: 'code', description: 'desc'}];
const LABEL_VALUES_200: LabelValue[] = [{value: '200'}];
const LABEL_VALUES_400: LabelValue[] = [{value: '400'}];
const LABEL_VALUES_EXRTA: LabelValue[] = [{value: '200'}, {value: '400'}];

describe('DerivedGauge', () => {
  let instance: DerivedGauge;
  let now: number;
  const expectedMetricDescriptor = {
    name: METRIC_NAME,
    description: METRIC_DESCRIPTION,
    unit: UNIT,
    type: GAUGE_INT64,
    labelKeys: LABEL_KEYS
  };

  beforeEach(() => {
    instance = new DerivedGauge(
        METRIC_NAME, METRIC_DESCRIPTION, UNIT, GAUGE_INT64, LABEL_KEYS);
  });

  describe('createTimeSeries()', () => {
    it('should throw an error when the labelvalues are null', () => {
      assert.throws(() => {
        instance.createTimeSeries(null, new Map());
      }, /^Error: Missing mandatory labelValues parameter$/);
    });
    it('should throw an error when the labelValues elements contains NULL',
       () => {
         const LABEL_VALUES_WITH_NULL: LabelValue[] = [null];
         assert.throws(() => {
           instance.createTimeSeries(LABEL_VALUES_WITH_NULL, new Map());
         }, /^Error: labelValue elements should not be a NULL$/);
       });
    it('should throw an error when the keys and values dont have same size',
       () => {
         assert.throws(() => {
           instance.createTimeSeries(LABEL_VALUES_EXRTA, new Map());
         }, /^Error: Label Keys and Label Values don't have same size$/);
       });
    it('should return a Metric', () => {
      const map = new Map();
      map.set('key', 'value');
      instance.createTimeSeries(LABEL_VALUES_200, map);
      map.set('key1', 'value1');

      now = Date.now();
      let metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);

      const [timeseries] = metric.timeseries;
      const [points] = timeseries.points;
      assert.deepStrictEqual(timeseries.labelValues, LABEL_VALUES_200);
      assert.equal(points.value, 2);
      assert.equal(Math.floor(now / 1e3), points.timestamp.seconds);
      assert.ok(points.timestamp.nanos > 0);
      // add data in collection
      map.set('key2', 'value2');
      map.set('key3', 'value3');

      // add new timeseries with length-method
      const arr = new Array(5).fill('test');
      instance.createTimeSeries(LABEL_VALUES_400, {
        size: () => arr.length,
      });

      metric = instance.getMetric();
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 2);

      const [timeseries1, timeseries2] = metric.timeseries;
      assert.deepStrictEqual(timeseries1.labelValues, LABEL_VALUES_200);
      assert.deepStrictEqual(timeseries1.points[0].value, 4);
      assert.deepStrictEqual(timeseries2.labelValues, LABEL_VALUES_400);
      assert.deepStrictEqual(timeseries2.points[0].value, 5);
      assert.deepStrictEqual(
          timeseries1.points[0].timestamp, timeseries2.points[0].timestamp);
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
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);

      const [timeseries] = metric.timeseries;
      assert.deepStrictEqual(timeseries.labelValues, LABEL_VALUES_200);
      assert.deepStrictEqual(timeseries.points[0].value, 45);
      assert.ok(timeseries.points[0].timestamp.seconds > 0);
      assert.equal(
          timeseries.points[0].timestamp.seconds, Math.floor(now / 1e3));
    });
    it('should return a Metric (Double) - custom object', () => {
      class QueueManager {
        getValue(): number {
          return 0.7;
        }
      }
      const obj = new QueueManager();
      const doubleInstance = new DerivedGauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, GAUGE_DOUBLE, LABEL_KEYS);
      doubleInstance.createTimeSeries(LABEL_VALUES_200, obj);
      const metric = doubleInstance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, {
        name: METRIC_NAME,
        description: METRIC_DESCRIPTION,
        unit: UNIT,
        type: GAUGE_DOUBLE,
        labelKeys: LABEL_KEYS
      });
      assert.equal(metric.timeseries.length, 1);
      const [timeseries] = metric.timeseries;
      assert.deepStrictEqual(timeseries.labelValues, LABEL_VALUES_200);
      assert.deepStrictEqual(timeseries.points[0].value, 0.7);
    });
    it('should throw an error when obj is null', () => {
      assert.throws(() => {
        instance.createTimeSeries(LABEL_VALUES_200, null);
      }, /^Error: Missing mandatory obj parameter$/);
    });
    it('should not create same timeseries again', () => {
      const map = new Map();
      instance.createTimeSeries(LABEL_VALUES_200, map);
      map.set('key', 'value');
      const metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      const [timeseries] = metric.timeseries;
      assert.deepStrictEqual(timeseries.labelValues, LABEL_VALUES_200);
      assert.deepStrictEqual(timeseries.points[0].value, 1);

      // create timeseries with same labels.
      assert.throws(() => {
        instance.createTimeSeries(LABEL_VALUES_200, map);
      }, /^Error: A different time series with the same labels already exists.$/);
    });
  });
  describe('removeTimeSeries()', () => {
    it('should throw an error when the labelvalues are null', () => {
      assert.throws(() => {
        instance.removeTimeSeries(null);
      }, /^Error: Missing mandatory labelValues parameter$/);
    });
    it('should remove TimeSeries', () => {
      const arr: string[] = [];
      instance.createTimeSeries(LABEL_VALUES_200, arr);
      arr.push('test');
      let metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
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
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 2);
      instance.clear();
      metric = instance.getMetric();
      assert.deepStrictEqual(metric, null);
    });
  });
});
