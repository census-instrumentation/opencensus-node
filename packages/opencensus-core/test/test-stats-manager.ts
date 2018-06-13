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

import {StatsExporter} from '../src/exporters/types';
import {AggregationCount, AggregationDistribution, AggregationLastValue, AggregationSum, Measure, MeasureDouble, MeasureInt64, Measurement, StatsManager, Tags, View} from '../src/index';

let registeredView: View;
let registeredMeasure: Measure;
let recordedView: View;
let recordedMeasurement: Measurement;

class TestExporter implements StatsExporter {
  onRegisterView(view: View, measure: Measure) {
    registeredView = view;
    registeredMeasure = measure;
  }
  onRecord(view: View, measurement: Measurement) {
    recordedView = view;
    recordedMeasurement = measurement;
  }
}

describe('Stats Manager', () => {
  describe('new StatsManager()', () => {
    it('should create a StatsManager instance without errors', () => {
      const manager = new StatsManager();
      assert.ok(manager instanceof StatsManager);
    });
  });

  describe('createAggregationCount()', () => {
    it('should create a AggregationCount instance without errors', () => {
      const manager = new StatsManager();
      const aggregation = manager.createAggregationCount();
      assert.ok(aggregation instanceof AggregationCount);
    });
  });

  describe('createAggregationSum()', () => {
    it('should create a AggregationSum instance without errors', () => {
      const manager = new StatsManager();
      const aggregation = manager.createAggregationSum();
      assert.ok(aggregation instanceof AggregationSum);
    });
  });

  describe('createAggregationLastValue()', () => {
    it('should create a AggregationLastValue instance without errors', () => {
      const manager = new StatsManager();
      const aggregation = manager.createAggregationLastValue();
      assert.ok(aggregation instanceof AggregationLastValue);
    });
  });

  describe('createAggregationDistribution()', () => {
    it('should create a AggregationCount instance without errors', () => {
      const manager = new StatsManager();
      const buckets = [0, 16, 256];
      const aggregation = manager.createAggregationDistribution(buckets);
      assert.ok(aggregation instanceof AggregationDistribution);
    });
  });

  describe('registerView()', () => {
    it('should register a view in stats manager instance', () => {
      const exporter = new TestExporter();
      const manager = new StatsManager();
      const tags = {'my.org/keys/frontend': 'mobile-ios9.3.5'} as Tags;
      const measure = new MeasureDouble(
          'my.org/measure/video_size', 'size of processed videos', 'By');
      const buckets = [0, 16, 256];
      const aggregation = manager.createAggregationDistribution(buckets);
      const view = {
        name: 'my.org/views/video_size',
        description: 'processed video size over time',
        columns: tags,
        startTime: new Date(),
        endTime: new Date(),
        measure,
        aggregation
      } as View;

      manager.registerExporter(exporter);
      manager.registerView(view);
      const registeredViews = manager.getRegisteredViews();

      assert.equal(registeredView, view);
      assert.equal(registeredMeasure, measure);
      assert.equal(registeredViews[view.name], view);
    });
  });

  describe('record()', () => {
    it('should record a measurements list in stats manager instance', () => {
      const exporter = new TestExporter();
      const manager = new StatsManager();
      const tags = {'my.org/keys/frontend': 'mobile-ios9.3.5'} as Tags;
      const measure = new MeasureInt64(
          'my.org/measure/video_size', 'size of processed videos', 'By');
      const buckets = [0, 16, 256];
      const aggregation = manager.createAggregationDistribution(buckets);
      const view = {
        name: 'my.org/views/video_size',
        description: 'processed video size over time',
        columns: tags,
        startTime: new Date(),
        endTime: new Date(),
        measure,
        aggregation
      } as View;
      const measurement = {measure, value: 25} as Measurement;

      manager.registerExporter(exporter);
      manager.registerView(view);
      manager.record(measurement);
      const recordedMeasurements = manager.getRecordedMeasurements();

      assert.equal(recordedMeasurement, measurement);
      assert.equal(recordedView, view);
      assert.equal(recordedMeasurements[view.name][0], measurement);
    });
  });
});