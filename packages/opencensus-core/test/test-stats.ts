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
import {
  BaseView,
  globalStats,
  StatsEventListener,
  TagKey,
  TagMap,
  TagValue,
} from '../src';
import {
  AggregationType,
  LastValueData,
  Measure,
  Measurement,
  MeasureType,
  MeasureUnit,
  View,
} from '../src/stats/types';
import * as tagger from '../src/tags/tagger';

class TestExporter implements StatsEventListener {
  registeredViews: View[] = [];
  recordedMeasurements: Measurement[] = [];

  onRegisterView(view: View) {
    this.registeredViews.push(view);
  }

  onRecord(
    views: View[],
    measurement: Measurement,
    tagMap: Map<TagKey, TagValue>
  ) {
    this.recordedMeasurements.push(measurement);
  }

  start(): void {
    // TODO(mayurkale): dependency with PR#253.
  }

  stop(): void {}

  clean() {
    this.registeredViews = [];
    this.recordedMeasurements = [];
  }
}

describe('Stats', () => {
  afterEach(() => {
    globalStats.clear();
  });

  const viewName = 'testViewName';
  const tagKeys = [{ name: 'testKey1' }, { name: 'testKey2' }];
  const tagValues = [{ value: 'testValue1' }, { value: 'testValue2' }];
  const tagMap = new TagMap();
  tagMap.set(tagKeys[0], tagValues[0]);
  tagMap.set(tagKeys[1], tagValues[1]);

  const measureName = 'testMeasureDouble';
  const measureUnit = MeasureUnit.UNIT;
  const description = 'test description';

  describe('createMeasureDouble()', () => {
    it('should create a measure of type double', () => {
      const measureDouble = globalStats.createMeasureDouble(
        measureName,
        measureUnit,
        description
      );
      assert.strictEqual(measureDouble.type, MeasureType.DOUBLE);
      assert.strictEqual(measureDouble.name, measureName);
      assert.strictEqual(measureDouble.unit, measureUnit);
      assert.strictEqual(measureDouble.description, description);
    });
  });

  describe('createMeasureInt64()', () => {
    it('should create a measure of type int64', () => {
      const measureDouble = globalStats.createMeasureInt64(
        measureName,
        measureUnit,
        description
      );
      assert.strictEqual(measureDouble.type, MeasureType.INT64);
      assert.strictEqual(measureDouble.name, measureName);
      assert.strictEqual(measureDouble.unit, measureUnit);
      assert.strictEqual(measureDouble.description, description);
    });
  });

  describe('createView()', () => {
    const aggregationTypes = [
      AggregationType.COUNT,
      AggregationType.SUM,
      AggregationType.LAST_VALUE,
      AggregationType.DISTRIBUTION,
    ];
    let measure: Measure;

    before(() => {
      measure = globalStats.createMeasureInt64(measureName, measureUnit);
    });

    after(() => {
      globalStats.clear();
    });

    for (const aggregationType of aggregationTypes) {
      it(`should create a view with ${aggregationType} aggregation`, () => {
        const bucketBoundaries = AggregationType.DISTRIBUTION ? [1, 2, 3] : [];
        const view = globalStats.createView(
          viewName,
          measure,
          aggregationType,
          tagKeys,
          description,
          bucketBoundaries
        );
        globalStats.registerView(view);

        assert.strictEqual(view.name, viewName);
        assert.strictEqual(view.measure, measure);
        assert.strictEqual(view.description, description);
        assert.deepStrictEqual(view.measure, measure);
        assert.strictEqual(view.aggregation, aggregationType);
        assert.ok(view.registered);
      });
    }

    it('should not create a view with distribution aggregation when no bucket boundaries were given', () => {
      // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
      assert.throws(globalStats.createView, 'No bucketBoundaries specified');
    });
  });

  describe('registerView()', () => {
    let measure: Measure;
    const testExporter = new TestExporter();

    before(() => {
      testExporter.clean();
      measure = globalStats.createMeasureInt64(measureName, measureUnit);
    });

    it('should register a view', () => {
      globalStats.registerExporter(testExporter);
      const view = new BaseView(
        viewName,
        measure,
        AggregationType.LAST_VALUE,
        tagKeys,
        description
      );

      assert.ok(!view.registered);
      assert.strictEqual(testExporter.registeredViews.length, 0);

      globalStats.registerView(view);

      assert.ok(view.registered);
      assert.strictEqual(testExporter.registeredViews.length, 1);
      assert.deepStrictEqual(testExporter.registeredViews[0], view);
    });
  });

  describe('unregisterExporter()', () => {
    const testExporter = new TestExporter();

    it('should unregister the exporter', () => {
      globalStats.registerExporter(testExporter);
      const measure = globalStats.createMeasureInt64(measureName, measureUnit);
      const view = new BaseView(
        viewName,
        measure,
        AggregationType.LAST_VALUE,
        tagKeys,
        description
      );
      globalStats.unregisterExporter(testExporter);
      globalStats.registerView(view);

      assert.strictEqual(testExporter.registeredViews.length, 0);
    });
  });

  describe('record()', () => {
    let measure: Measure;
    const testExporter = new TestExporter();
    let aggregationData: LastValueData;
    before(() => {
      measure = globalStats.createMeasureInt64(measureName, measureUnit);
    });

    beforeEach(() => {
      testExporter.clean();
      globalStats.registerExporter(testExporter);
      const view = globalStats.createView(
        viewName,
        measure,
        AggregationType.LAST_VALUE,
        tagKeys,
        description
      );
      globalStats.registerView(view);
    });

    afterEach(() => {
      globalStats.clear();
    });

    it('should record a single measurement', () => {
      const measurement = { measure, value: 1 };
      assert.strictEqual(testExporter.recordedMeasurements.length, 0);
      globalStats.record([measurement], tagMap);
      assert.strictEqual(testExporter.recordedMeasurements.length, 1);
      assert.deepStrictEqual(testExporter.recordedMeasurements[0], measurement);
      aggregationData = testExporter.registeredViews[0].getSnapshot(
        tagValues
      ) as LastValueData;
      assert.strictEqual(aggregationData.value, measurement.value);
    });

    it('should not record a single negative measurement', () => {
      globalStats.registerExporter(testExporter);
      const measurement = { measure, value: -1 };
      globalStats.record([measurement], tagMap);
      assert.strictEqual(testExporter.recordedMeasurements.length, 0);
    });

    it('should record when tagMap is not passed', () => {
      globalStats.registerExporter(testExporter);
      const measurement = { measure, value: 10 };
      globalStats.record([measurement]);
      assert.strictEqual(testExporter.recordedMeasurements.length, 2);
    });

    it('should record multiple measurements', () => {
      const measurement1 = { measure, value: 1 };
      const measurement2 = { measure, value: 1 };
      assert.strictEqual(testExporter.recordedMeasurements.length, 0);
      globalStats.record([measurement1, measurement2], tagMap);
      assert.strictEqual(testExporter.recordedMeasurements.length, 2);
      assert.deepStrictEqual(
        testExporter.recordedMeasurements[0],
        measurement1
      );
      assert.deepStrictEqual(
        testExporter.recordedMeasurements[1],
        measurement2
      );
      aggregationData = testExporter.registeredViews[0].getSnapshot(
        tagValues
      ) as LastValueData;
      assert.strictEqual(aggregationData.value, measurement2.value);
    });

    it('should skip whole multiple measurment if one of value is negative', () => {
      const measurments = [
        { measure, value: 1 },
        { measure, value: -1 },
        { measure, value: 1 },
      ];
      globalStats.record(measurments, tagMap);
      assert.strictEqual(testExporter.recordedMeasurements.length, 0);
    });

    it('should record against implicit context when set', () => {
      const tags = new TagMap();
      tags.set(tagKeys[0], { value: 'value1' });
      tags.set(tagKeys[1], { value: 'value2' });
      const measurement = { measure, value: 1 };
      globalStats.withTagContext(tags, () => {
        globalStats.record([measurement]);
      });

      assert.strictEqual(testExporter.recordedMeasurements.length, 1);
      assert.deepStrictEqual(testExporter.recordedMeasurements[0], measurement);
      aggregationData = testExporter.registeredViews[0].getSnapshot([
        { value: 'value1' },
        { value: 'value2' },
      ]) as LastValueData;
      assert.strictEqual(aggregationData.value, measurement.value);
      assert.deepStrictEqual(aggregationData.tagValues, [
        { value: 'value1' },
        { value: 'value2' },
      ]);
    });

    it('should record against implicit context when not set or empty', () => {
      const UNKNOWN_TAG_VALUE: TagValue | null = null;
      globalStats.registerExporter(testExporter);
      const measurement = { measure, value: 2211 };
      globalStats.withTagContext(tagger.EMPTY_TAG_MAP, () => {
        globalStats.record([measurement]);
      });

      aggregationData = testExporter.registeredViews[0].getSnapshot([
        UNKNOWN_TAG_VALUE,
        UNKNOWN_TAG_VALUE,
      ]) as LastValueData;
      assert.strictEqual(aggregationData.value, measurement.value);
      assert.deepStrictEqual(aggregationData.tagValues, [
        UNKNOWN_TAG_VALUE,
        UNKNOWN_TAG_VALUE,
      ]);
    });
  });
});
