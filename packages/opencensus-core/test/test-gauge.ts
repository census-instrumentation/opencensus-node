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
import {Gauge} from '../src/metrics/gauges/gauge';

const METRIC_NAME = 'metric-name';
const METRIC_DESCRIPTION = 'metric-description';
const UNIT = '1';
const GAUGE_INT64 = MetricDescriptorType.GAUGE_INT64;
const GAUGE_DOUBLE = MetricDescriptorType.GAUGE_DOUBLE;
const LABEL_KEYS: LabelKey[] = [{key: 'code', description: 'desc'}];
const LABEL_VALUES_200: LabelValue[] = [{value: '200'}];
const LABEL_VALUES_400: LabelValue[] = [{value: '400'}];
const LABEL_VALUES_EXRTA: LabelValue[] = [{value: '200'}, {value: '400'}];
const UNSET_LABEL_VALUE: LabelValue = {
  value: null
};

describe('GAUGE_INT64', () => {
  const oldProcessHrtime = process.hrtime;
  let instance: Gauge;
  const expectedMetricDescriptor = {
    name: METRIC_NAME,
    description: METRIC_DESCRIPTION,
    unit: UNIT,
    type: GAUGE_INT64,
    labelKeys: LABEL_KEYS
  };

  beforeEach(() => {
    instance = new Gauge(
        METRIC_NAME, METRIC_DESCRIPTION, UNIT, GAUGE_INT64, LABEL_KEYS);
    process.hrtime = () => [1000, 1e7];
  });

  afterEach(() => {
    process.hrtime = oldProcessHrtime;
  });

  describe('getOrCreateTimeSeries()', () => {
    it('should throw an error when the labelvalues are null', () => {
      assert.throws(() => {
        instance.getOrCreateTimeSeries(null);
      }, /^Error: Missing mandatory labelValues parameter$/);
    });
    it('should throw an error when the labelValues elements contains NULL',
       () => {
         const LABEL_VALUES_WITH_NULL: LabelValue[] = [null];
         assert.throws(() => {
           instance.getOrCreateTimeSeries(LABEL_VALUES_WITH_NULL);
         }, /^Error: labelValue elements should not be a NULL$/);
       });
    it('should throw an error when the keys and values dont have same size',
       () => {
         assert.throws(() => {
           instance.getOrCreateTimeSeries(LABEL_VALUES_EXRTA);
         }, /^Error: Label Keys and Label Values don't have same size$/);
       });
    it('should return a Metric', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.add(10);
      let metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: LABEL_VALUES_200,
            points: [{value: 10, timestamp: {nanos: 1e7, seconds: 1000}}]
          }]);
      // add value and create new timeseries.
      point.add(5);
      const point1 = instance.getOrCreateTimeSeries(LABEL_VALUES_400);
      point1.set(-8);
      metric = instance.getMetric();
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 2);
      assert.deepStrictEqual(metric.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [{value: 15, timestamp: {nanos: 1e7, seconds: 1000}}]
        },
        {
          labelValues: LABEL_VALUES_400,
          points: [{value: -8, timestamp: {nanos: 1e7, seconds: 1000}}]
        }
      ]);
    });
    it('should not create same timeseries again', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.add(10);
      let metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: LABEL_VALUES_200,
            points: [{value: 10, timestamp: {nanos: 1e7, seconds: 1000}}]
          }]);
      // create timeseries with same labels.
      const point1 = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point1.add(30);
      metric = instance.getMetric();
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: LABEL_VALUES_200,
            points: [{value: 40, timestamp: {nanos: 1e7, seconds: 1000}}]
          }]);
    });
  });
  describe('getDefaultTimeSeries()', () => {
    it('should create new default timeseries', () => {
      const point = instance.getDefaultTimeSeries();
      point.add(10);
      const metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: [UNSET_LABEL_VALUE],
            points: [{value: 10, timestamp: {nanos: 1e7, seconds: 1000}}]
          }]);
    });
    it('should return same timeseries for interchanged labels', () => {
      instance = new Gauge(
          METRIC_NAME, METRIC_DESCRIPTION, UNIT, GAUGE_INT64,
          [{key: 'k1', description: 'desc'}, {key: 'k2', description: 'desc'}]);
      const point =
          instance.getOrCreateTimeSeries([{value: '200'}, {value: '400'}]);
      point.add(200);
      const point1 =
          instance.getOrCreateTimeSeries([{value: '400'}, {value: '200'}]);
      point1.add(400);
      const metric = instance.getMetric();
      assert.equal(metric.timeseries.length, 1);
    });
    it('should create same labelValues as labelKeys', () => {
      instance = new Gauge(METRIC_NAME, METRIC_DESCRIPTION, UNIT, GAUGE_INT64, [
        {key: 'k1', description: 'desc'}, {key: 'k2', description: 'desc'},
        {key: 'k3', description: 'desc'}
      ]);
      const point = instance.getDefaultTimeSeries();
      point.add(200);
      const metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor.labelKeys.length, 3);
      assert.deepStrictEqual(metric.descriptor.type, 1);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues:
                [UNSET_LABEL_VALUE, UNSET_LABEL_VALUE, UNSET_LABEL_VALUE],
            points: [{value: 200, timestamp: {nanos: 1e7, seconds: 1000}}]
          }]);
    });
    it('should use previously created default timeseries', () => {
      const point = instance.getDefaultTimeSeries();
      point.add(300);
      let metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: [UNSET_LABEL_VALUE],
            points: [{value: 300, timestamp: {nanos: 1e7, seconds: 1000}}]
          }]);
      // get default timeseries again.
      const point1 = instance.getDefaultTimeSeries();
      point1.add(400);
      metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: [UNSET_LABEL_VALUE],
            points: [{value: 700, timestamp: {nanos: 1e7, seconds: 1000}}]
          }]);
    });
  });
  describe('removeTimeSeries()', () => {
    it('should throw an error when the labelvalues are null', () => {
      assert.throws(() => {
        instance.removeTimeSeries(null);
      }, /^Error: Missing mandatory labelValues parameter$/);
    });
    it('should remove TimeSeries', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.add(10);
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
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.add(10);
      const point1 = instance.getOrCreateTimeSeries(LABEL_VALUES_400);
      point1.add(10);
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

describe('GAUGE_DOUBLE', () => {
  const oldProcessHrtime = process.hrtime;
  let instance: Gauge;
  const expectedMetricDescriptor = {
    name: METRIC_NAME,
    description: METRIC_DESCRIPTION,
    unit: UNIT,
    type: GAUGE_DOUBLE,
    labelKeys: LABEL_KEYS
  };

  beforeEach(() => {
    instance = new Gauge(
        METRIC_NAME, METRIC_DESCRIPTION, UNIT, GAUGE_DOUBLE, LABEL_KEYS);
    process.hrtime = () => [1000, 1e7];
  });

  afterEach(() => {
    process.hrtime = oldProcessHrtime;
  });

  describe('getOrCreateTimeSeries()', () => {
    it('should throw an error when the labelvalues are null', () => {
      assert.throws(() => {
        instance.getOrCreateTimeSeries(null);
      }, /^Error: Missing mandatory labelValues parameter$/);
    });
    it('should throw an error when the labelValues elements contains NULL',
       () => {
         const LABEL_VALUES_WITH_NULL: LabelValue[] = [null];
         assert.throws(() => {
           instance.getOrCreateTimeSeries(LABEL_VALUES_WITH_NULL);
         }, /^Error: labelValue elements should not be a NULL$/);
       });
    it('should throw an error when the keys and values dont have same size',
       () => {
         assert.throws(() => {
           instance.getOrCreateTimeSeries(LABEL_VALUES_EXRTA);
         }, /^Error: Label Keys and Label Values don't have same size$/);
       });
    it('should return a Metric', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.add(10.34);
      let metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: LABEL_VALUES_200,
            points: [{value: 10.34, timestamp: {nanos: 1e7, seconds: 1000}}],
          }]);
      // add value and create new timeseries.
      point.add(5.12);
      const point1 = instance.getOrCreateTimeSeries(LABEL_VALUES_400);
      point1.set(-8.3);
      metric = instance.getMetric();
      assert.equal(metric.timeseries.length, 2);
      assert.deepStrictEqual(metric.timeseries, [
        {
          labelValues: LABEL_VALUES_200,
          points: [{value: 15.46, timestamp: {nanos: 1e7, seconds: 1000}}]
        },
        {
          labelValues: LABEL_VALUES_400,
          points: [{value: -8.3, timestamp: {nanos: 1e7, seconds: 1000}}]
        }
      ]);
    });
    it('should not create same timeseries again', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.add(12.1);
      let metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: LABEL_VALUES_200,
            points: [{value: 12.1, timestamp: {nanos: 1e7, seconds: 1000}}],
          }]);
      // create timeseries with same labels.
      const point1 = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point1.add(30.18);
      metric = instance.getMetric();
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: LABEL_VALUES_200,
            points: [{value: 42.28, timestamp: {nanos: 1e7, seconds: 1000}}],
          }]);
    });
  });
  describe('getDefaultTimeSeries()', () => {
    it('should create new default timeseries', () => {
      const point = instance.getDefaultTimeSeries();
      point.add(10.1);
      const metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: [UNSET_LABEL_VALUE],
            points: [{value: 10.1, timestamp: {nanos: 1e7, seconds: 1000}}],
          }]);
    });
    it('should use previously created default timeseries', () => {
      const point = instance.getDefaultTimeSeries();
      point.add(300.1);
      let metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: [UNSET_LABEL_VALUE],
            points: [{value: 300.1, timestamp: {nanos: 1e7, seconds: 1000}}],
          }]);
      // get default timeseries again.
      const point1 = instance.getDefaultTimeSeries();
      point1.add(400.1);
      metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor, expectedMetricDescriptor);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues: [UNSET_LABEL_VALUE],
            points: [{value: 700.2, timestamp: {nanos: 1e7, seconds: 1000}}],
          }]);
    });
    it('should create same labelValues as labelKeys', () => {
      instance =
          new Gauge(METRIC_NAME, METRIC_DESCRIPTION, UNIT, GAUGE_DOUBLE, [
            {key: 'k1', description: 'desc'}, {key: 'k2', description: 'desc'},
            {key: 'k3', description: 'desc'}
          ]);
      const point = instance.getDefaultTimeSeries();
      point.add(10.1);
      const metric = instance.getMetric();
      assert.notEqual(metric, null);
      assert.deepStrictEqual(metric.descriptor.labelKeys.length, 3);
      assert.deepStrictEqual(metric.descriptor.type, 2);
      assert.equal(metric.timeseries.length, 1);
      assert.deepStrictEqual(
          metric.timeseries, [{
            labelValues:
                [UNSET_LABEL_VALUE, UNSET_LABEL_VALUE, UNSET_LABEL_VALUE],
            points: [{value: 10.1, timestamp: {nanos: 1e7, seconds: 1000}}],
          }]);
    });
  });
  describe('removeTimeSeries()', () => {
    it('should throw an error when the labelvalues are null', () => {
      assert.throws(() => {
        instance.removeTimeSeries(null);
      }, /^Error: Missing mandatory labelValues parameter$/);
    });
    it('should remove TimeSeries', () => {
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.add(10.23);
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
      const point = instance.getOrCreateTimeSeries(LABEL_VALUES_200);
      point.add(10.34);
      const point1 = instance.getOrCreateTimeSeries(LABEL_VALUES_400);
      point1.add(15.2);
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
