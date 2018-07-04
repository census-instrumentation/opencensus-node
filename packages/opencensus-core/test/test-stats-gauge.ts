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

import {MeasureManager} from '../src/stats/model/measure';
import {GaugeMetric} from '../src/stats/model/metrics/gauge';
import {MetricDescriptor} from '../src/stats/model/metrics/types';
import {Measure, MeasureUnit} from '../src/stats/model/types';


describe('GaugeMetric', () => {
  const measure: MetricDescriptor = {
    name: 'counter_test',
    description: '',
    unit: MeasureUnit.unit,
    type: '',
    labelKeys: []
  };

  let metric: GaugeMetric;


  describe('increment without tags', () => {
    beforeEach(() => {
      metric = new GaugeMetric({descriptor: measure});
      metric.set(10);
    });


    it('should set a gauge to provided value', () => {
      assert.strictEqual(metric.getRecorder().value, 10);
      assert.strictEqual(metric.getRecorder().count, 1);
      assert.strictEqual(metric.getRecorder().sum, 10);
    });

    it('should increase with 1 if no param provided', () => {
      metric.increment();
      assert.strictEqual(metric.getRecorder().value, 11);
    });

    it('should increase with param value if provided', () => {
      metric.increment(5);
      assert.strictEqual(metric.getRecorder().value, 15);
    });

    it('should decrease with 1 if no param provided', () => {
      metric.decrement();
      assert.strictEqual(metric.getRecorder().value, 9);
    });

    it('should decrease with param if provided', () => {
      metric.decrement(5);
      assert.strictEqual(metric.getRecorder().value, 5);
    });

    it('should set provided value and check sum and numSamples', () => {
      metric.set(15);
      metric.increment(5);
      metric.decrement(3);
      assert.strictEqual(metric.getRecorder().count, 4);
      assert.strictEqual(metric.getRecorder().sum, 10 + 15 + 20 + 17);
    });
  });

  describe('with labels', () => {
    measure.labelKeys = ['method', 'statusCode'];
    const tagsGET = {method: 'GET', statusCode: '200'};
    const tagsPOST = {method: 'POST', statusCode: '200'};
    const tagsERRR = {method: 'GET', statusCode: '500'};

    beforeEach(() => {
      metric = new GaugeMetric({descriptor: measure});
      metric.labelValues(tagsGET).set(20);
    });
    it('should be able to increment', () => {
      metric.labelValues(tagsGET).increment();
      assert.strictEqual(metric.getRecorder(tagsGET).value, 21);
    });
    it('should be able to decrement', () => {
      metric.labelValues(tagsGET).decrement();
      assert.strictEqual(metric.getRecorder(tagsGET).value, 19);
    });
    it('should be able to set value', () => {
      metric.labelValues(tagsGET).set(500);
      assert.strictEqual(metric.getRecorder(tagsGET).value, 500);
    });

    it('should not set value with tag property', () => {
      const invalidTag = {method: 'GET', path: '/testPath'};
      assert.strictEqual(metric.labelValues(invalidTag), undefined);
      assert.strictEqual(metric.getRecorder(invalidTag), undefined);
    });

    it('should increment with particial valid tags', () => {
      const particialTag = {method: 'GET'};
      metric.labelValues(particialTag).increment();
      assert.strictEqual(metric.getRecorder(particialTag).value, 1);
    });

    it('should set a gauge setting current tag', () => {
      metric.currentLabelValue = tagsGET;
      metric.increment(5);
      assert.strictEqual(metric.getRecorder().value, 25);
      assert.strictEqual(metric.getRecorder().count, 2);
      assert.strictEqual(metric.getRecorder().sum, 20 + 25);
      assert.strictEqual(metric.getRecorder(tagsGET).value, 25);
    });
  });
});
