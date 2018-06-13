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

import {AggregationCount, AggregationDistribution, AggregationLastValue, AggregationSum, HistogramBucket, MeasureDouble, Measurement} from '../src/index';

describe('Stats Aggregation', () => {
  const measure = new MeasureDouble(
      'my.org/measure/video_size', 'size of processed videos', 'By');
  const measurement1 = {measure, value: 25} as Measurement;
  const measurement2 = {measure, value: 50} as Measurement;
  const measurements = [measurement1, measurement2];

  describe('AggregationCount', () => {
    const aggregation = new AggregationCount();
    aggregation.measurements = measurements;

    it('should create a instance without errors', () => {
      assert.ok(aggregation instanceof AggregationCount);
    });
    it('should get the correct aggregation value', () => {
      assert.strictEqual(aggregation.getValue(), 2);
    });
    it('should get the correct aggregation type', () => {
      assert.strictEqual(aggregation.getType(), 'COUNT');
    });
  });

  describe('AggregationSum', () => {
    const aggregation = new AggregationSum();
    aggregation.measurements = measurements;

    it('should create a instance without errors', () => {
      assert.ok(aggregation instanceof AggregationSum);
    });
    it('should get the correct aggregation value', () => {
      const sum = measurement1.value + measurement2.value;
      assert.strictEqual(aggregation.getValue(), sum);
    });
    it('should get the correct aggregation type', () => {
      assert.strictEqual(aggregation.getType(), 'SUM');
    });
  });

  describe('AggregationLastValue', () => {
    const aggregation = new AggregationLastValue();
    aggregation.measurements = measurements;

    it('should create a instance without errors', () => {
      assert.ok(aggregation instanceof AggregationLastValue);
    });
    it('should get the correct aggregation value', () => {
      assert.strictEqual(aggregation.getValue(), measurement2.value);
    });
    it('should get the correct aggregation type', () => {
      assert.strictEqual(aggregation.getType(), 'LAST VALUE');
    });
  });

  describe('AggregationDistribution', () => {
    const buckets = [0, 16, 256];
    const aggregation = new AggregationDistribution(buckets);
    aggregation.measurements = measurements;
    const expectedDistribution = [
      {range: {min: -Infinity, max: 0}, bucketCount: 0},
      {range: {min: 0, max: 16}, bucketCount: 0},
      {range: {min: 16, max: 256}, bucketCount: 2},
      {range: {min: 256, max: Infinity}, bucketCount: 0}
    ] as HistogramBucket[];

    it('should create a instance without errors', () => {
      assert.ok(aggregation instanceof AggregationDistribution);
    });
    it('should get the correct aggregation value', () => {
      const distribution = aggregation.getValue();
      for (let i = 0; i < distribution.length; i++) {
        assert.strictEqual(
            distribution[i].range.min, expectedDistribution[i].range.min);
        assert.strictEqual(
            distribution[i].range.max, expectedDistribution[i].range.max);
        assert.strictEqual(
            distribution[i].bucketCount, expectedDistribution[i].bucketCount);
      }
    });
    it('should get the correct aggregation type', () => {
      assert.strictEqual(aggregation.getType(), 'DISTRIBUTION');
    });
  });
});