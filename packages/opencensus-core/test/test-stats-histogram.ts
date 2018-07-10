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
import {HistogramMetric} from '../src/stats/model/metrics/histogram';
import {MetricDescriptor, MetricDistributions, MetricValuesTypes} from '../src/stats/model/metrics/types';
import {Measure, MeasureUnit} from '../src/stats/model/types';


describe('HistogramMetric', () => {
  const measure: MetricDescriptor = {
    name: 'counter_test',
    description: '',
    unit: MeasureUnit.unit,
    type: '',
    labelKeys: []
  };

  let metric: HistogramMetric;


  describe('increment without tags', () => {
    beforeEach(() => {
      metric = new HistogramMetric({
        descriptor: measure,
        boundaries:
            {range: {min: 1, max: 200}, bucketBoundaries: [0, 100, 200, 300]}
      });
    });


    it('should set a Histogram to provided value', () => {
      //
      // Values from:
      // https://sciencing.com/calculate-deviations-mean-sum-squares-5691381.html
      //
      metric.record(63);
      metric.record(89);
      metric.record(78);
      metric.record(90);
      metric.record(95);
      assert.strictEqual(metric.getRecorder().min, 63);
      assert.strictEqual(metric.getRecorder().max, 95);
      assert.strictEqual(metric.getRecorder().count, 5);
      assert.strictEqual(metric.getRecorder().sum, 415);
      assert.strictEqual(metric.getRecorder().mean, 83);
      assert.strictEqual(metric.getRecorder().sumSquaredDeviations, 654);

      // check Snapshot Value
      const values = metric.metricSnapshotValues as MetricDistributions;
      assert.strictEqual(values.length, 1);
      const distribution = values[0];
      assert.strictEqual(distribution.min, 63);
      assert.strictEqual(distribution.max, 95);
      assert.strictEqual(distribution.count, 5);
      assert.strictEqual(distribution.sum, 415);
      assert.strictEqual(distribution.mean, 83);
      assert.strictEqual(distribution.sumSquaredDeviations, 654);
      assert.strictEqual(Object.keys(distribution.tags).length, 0);
      assert.strictEqual(distribution.type, MetricValuesTypes.distribution);
    });
  });


  describe('with labels', () => {
    measure.labelKeys = ['method', 'statusCode'];
    const tagsGET = {method: 'GET', statusCode: '200'};

    beforeEach(() => {
      metric = new HistogramMetric({
        descriptor: measure,
        boundaries: {
          range: {min: 100, max: 200},
          bucketBoundaries: [0, 100, 200, 300]
        }
      });
    });

    it('should set a Histogram to provided value', () => {
      metric.labelValues(tagsGET).record(99, 9);
      metric.labelValues(tagsGET).record(100);
      metric.labelValues(tagsGET).record(150, 998);
      metric.labelValues(tagsGET).record(200, 2);

      assert.strictEqual(metric.getRecorder(tagsGET).min, 99);
      assert.strictEqual(metric.getRecorder(tagsGET).max, 200);
      assert.strictEqual(metric.getRecorder(tagsGET).count, 1010);

      // check Snapshot Value
      const values = metric.metricSnapshotValues as MetricDistributions;
      assert.strictEqual(values.length, 1);
      const distribution = values[0];
      assert.strictEqual(distribution.min, 99);
      assert.strictEqual(distribution.max, 200);
      assert.strictEqual(distribution.count, 1010);
      assert.strictEqual(distribution.tags.method, tagsGET.method);
      assert.strictEqual(distribution.tags.statusCode, tagsGET.statusCode);
      assert.strictEqual(distribution.type, MetricValuesTypes.distribution);
      assert.strictEqual(
          metric.getRecorder(distribution.labelKey),
          metric.getRecorder(tagsGET));
    });
  });
});
