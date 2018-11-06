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
import * as mocha from 'mocha';

import {BaseView, Stats, StatsEventListener} from '../src';
import {AggregationType, LastValueData, Measure, Measurement, MeasureType, MeasureUnit, View} from '../src/stats/types';

class TestExporter implements StatsEventListener {
  registeredViews: View[] = [];
  recordedMeasurements: Measurement[] = [];

  onRegisterView(view: View) {
    this.registeredViews.push(view);
  }

  onRecord(views: View[], measurement: Measurement) {
    this.recordedMeasurements.push(measurement);
  }

  clean() {
    this.registeredViews = [];
    this.recordedMeasurements = [];
  }
}

describe('Stats', () => {
  let stats: Stats;

  beforeEach(() => {
    stats = new Stats();
  });

  const viewName = 'testViewName';
  const tags = {tagKey1: 'tagValue1', tagKey2: 'tagValue2'};
  const tagKeys = Object.keys(tags);
  const measureName = 'testMeasureDouble';
  const measureUnit = MeasureUnit.UNIT;
  const description = 'test description';

  describe('createMeasureDouble()', () => {
    it('should create a measure of type double', () => {
      const measureDouble =
          stats.createMeasureDouble(measureName, measureUnit, description);
      assert.strictEqual(measureDouble.type, MeasureType.DOUBLE);
      assert.strictEqual(measureDouble.name, measureName);
      assert.strictEqual(measureDouble.unit, measureUnit);
      assert.strictEqual(measureDouble.description, description);
    });
  });

  describe('createMeasureInt64()', () => {
    it('should create a measure of type int64', () => {
      const measureDouble =
          stats.createMeasureInt64(measureName, measureUnit, description);
      assert.strictEqual(measureDouble.type, MeasureType.INT64);
      assert.strictEqual(measureDouble.name, measureName);
      assert.strictEqual(measureDouble.unit, measureUnit);
      assert.strictEqual(measureDouble.description, description);
    });
  });

  describe('createView()', () => {
    const aggregationTypes = [
      AggregationType.COUNT, AggregationType.SUM, AggregationType.LAST_VALUE,
      AggregationType.DISTRIBUTION
    ];
    let measure: Measure;

    before(() => {
      measure = stats.createMeasureInt64(measureName, measureUnit);
    });

    for (const aggregationType of aggregationTypes) {
      it(`should create a view with ${aggregationType} aggregation`, () => {
        const bucketBoundaries =
            AggregationType.DISTRIBUTION ? [1, 2, 3] : null;
        const view = stats.createView(
            viewName, measure, aggregationType, tagKeys, description,
            bucketBoundaries);

        assert.strictEqual(view.name, viewName);
        assert.strictEqual(view.measure, measure);
        assert.strictEqual(view.description, description);
        assert.deepEqual(view.measure, measure);
        assert.strictEqual(view.aggregation, aggregationType);
        assert.ok(view.registered);
      });
    }

    it('should not create a view with distribution aggregation when no bucket boundaries were given',
       () => {
         assert.throws(stats.createView, 'No bucketBoundaries specified');
       });
  });

  describe('registerView()', () => {
    let measure: Measure;
    const testExporter = new TestExporter();

    before(() => {
      measure = stats.createMeasureInt64(measureName, measureUnit);
    });

    it('should register a view', () => {
      stats.registerExporter(testExporter);
      const view = new BaseView(
          viewName, measure, AggregationType.LAST_VALUE, tagKeys, description);

      assert.ok(!view.registered);
      assert.strictEqual(testExporter.registeredViews.length, 0);

      stats.registerView(view);

      assert.ok(view.registered);
      assert.strictEqual(testExporter.registeredViews.length, 1);
      assert.deepEqual(testExporter.registeredViews[0], view);
    });
  });

  describe('record()', () => {
    let measure: Measure;
    const testExporter = new TestExporter();

    before(() => {
      measure = stats.createMeasureInt64(measureName, measureUnit);
    });

    beforeEach(() => {
      testExporter.clean();
    });

    it('should record a single measurement', () => {
      stats.registerExporter(testExporter);
      const view = stats.createView(
          viewName, measure, AggregationType.LAST_VALUE, tagKeys, description);
      const measurement = {measure, tags, value: 1};

      assert.strictEqual(testExporter.recordedMeasurements.length, 0);

      stats.record(measurement);
      const aggregationData =
          testExporter.registeredViews[0].getSnapshot(tags) as LastValueData;

      assert.strictEqual(testExporter.recordedMeasurements.length, 1);
      assert.deepEqual(testExporter.recordedMeasurements[0], measurement);
      assert.strictEqual(aggregationData.value, measurement.value);
    });

    it('should record multiple measurements', () => {
      stats.registerExporter(testExporter);
      const view = stats.createView(
          viewName, measure, AggregationType.LAST_VALUE, tagKeys, description);
      const measurement1 = {measure, tags, value: 1};
      const measurement2 = {measure, tags, value: 1};

      assert.strictEqual(testExporter.recordedMeasurements.length, 0);

      stats.record(measurement1, measurement2);
      const aggregationData =
          testExporter.registeredViews[0].getSnapshot(tags) as LastValueData;

      assert.strictEqual(testExporter.recordedMeasurements.length, 2);
      assert.deepEqual(testExporter.recordedMeasurements[0], measurement1);
      assert.deepEqual(testExporter.recordedMeasurements[1], measurement2);
      assert.strictEqual(aggregationData.value, measurement2.value);
    });
  });
});
