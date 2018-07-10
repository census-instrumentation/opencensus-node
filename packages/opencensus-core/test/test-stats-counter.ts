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
import {CounterMetric} from '../src/stats/model/metrics/counter';
import {Counter} from '../src/stats/model/metrics/types';
import {MetricDescriptor} from '../src/stats/model/metrics/types';
import {Measure, MeasureUnit} from '../src/stats/model/types';


describe('CounterMetric', () => {
  const measure: MetricDescriptor = {
    name: 'counter_test',
    description: '',
    unit: MeasureUnit.unit,
    type: '',
    labelKeys: []
  };

  let metric: CounterMetric;


  describe('increment without tags', () => {
    beforeEach(() => {
      metric = new CounterMetric({descriptor: measure});
    });

    afterEach(() => {
      metric.reset();
    });

    it('should increment counter', () => {
      metric.increment();
      assert.strictEqual(metric.getRecorder().value, 1);
      metric.increment();
      assert.strictEqual(metric.getRecorder().value, 2);
      assert.ok(metric.getRecorder().timestamp);
    });
    it('should increment with a provided value', () => {
      metric.increment(100);
      assert.strictEqual(metric.getRecorder().value, 100);
    });

    it('should not be possible to decrease a counter', () => {
      assert.strictEqual(metric.getRecorder().value, 0);
      metric.increment(-100);
      assert.strictEqual(metric.getRecorder().value, 0);
    });

    it('should handle incrementing with 0', () => {
      assert.strictEqual(metric.getRecorder().value, 0);
      metric.increment(0);
      assert.strictEqual(metric.getRecorder().value, 0);
    });
  });


  describe('increment with tags', () => {
    measure.labelKeys = ['method', 'statusCode'];
    const tagsGET = {method: 'GET', statusCode: '200'};
    const tagsPOST = {method: 'POST', statusCode: '200'};
    const tagsERRR = {method: 'GET', statusCode: '500'};

    before(() => {
      metric = new CounterMetric({descriptor: measure});
    });

    afterEach(() => {
      metric.reset();
    });

    it(`should increment tags:${tagsGET} counter`, () => {
      metric.labelValues(tagsGET).increment();
      assert.strictEqual(metric.getRecorder(tagsGET).value, 1);
      metric.labelValues(tagsGET).increment();
      assert.strictEqual(metric.getRecorder(tagsGET).value, 2);
      assert.ok(metric.getRecorder(tagsGET).timestamp);
    });


    it('should increment with a provided value', () => {
      metric.labelValues(tagsPOST).increment(100);
      assert.strictEqual(metric.getRecorder(tagsPOST).value, 100);
    });


    it('should increment with more than one tag value', () => {
      metric.increment();
      metric.labelValues(tagsGET).increment();
      metric.labelValues(tagsPOST).increment(100);
      metric.labelValues(tagsERRR).increment();
      metric.labelValues(tagsERRR).increment();
      assert.strictEqual(metric.getRecorder().value, 1);
      assert.strictEqual(metric.getRecorder(tagsGET).value, 1);
      assert.strictEqual(metric.getRecorder(tagsPOST).value, 100);
      assert.strictEqual(metric.getRecorder(tagsERRR).value, 2);
    });


    it('should not increment invalid with tag property', () => {
      const invalidTag = {method: 'GET', path: '/testPath'};
      assert.strictEqual(metric.labelValues(invalidTag), undefined);
      assert.strictEqual(metric.getRecorder(invalidTag), undefined);
    });

    it('should increment with particial valid tags', () => {
      const particialTag = {method: 'GET'};
      metric.labelValues(particialTag).increment();
      assert.strictEqual(metric.getRecorder(particialTag).value, 1);
    });

    it('should increment setting currentTag ', () => {
      metric.currentLabelValue = tagsPOST;
      metric.increment();
      assert.strictEqual(metric.getRecorder().value, 1);
      metric.increment();
      assert.strictEqual(metric.getRecorder().value, 2);
      assert.strictEqual(metric.getRecorder(tagsPOST).value, 2);
      assert.ok(metric.getRecorder().timestamp);
    });
  });
});
