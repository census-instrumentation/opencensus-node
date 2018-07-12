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

import {Measure, Measurement, MeasureUnit, View} from '../src';
import {MeasureManager} from '../src/stats/model/measure';
import {CounterMetric} from '../src/stats/model/metrics/counter';
import {GaugeMetric} from '../src/stats/model/metrics/gauge';
import {HistogramMetric} from '../src/stats/model/metrics/histogram';
import {Distribution, MetricValuesTypes, SingleValue} from '../src/stats/model/metrics/types';
import {ViewManager} from '../src/stats/model/view';

const labelKeys = ['method', 'status'];
const labelValues = ['GET /home', '200'];

const viewManagerCreateMethodList = [
  {
    methodName: 'createCountView',
    method: ViewManager.createCountView,
    metric: CounterMetric,
    labelKeys,
    labelValues,
    values: [null, 5, 10, -10],
    results: [1, 6, 16, 16]
  },
  {
    methodName: 'createSumView',
    method: ViewManager.createSumView,
    metric: GaugeMetric,
    labelKeys,
    labelValues,
    values: [1, 5, 10, -10],
    results: [1, 6, 16, 6]
  },
  {
    methodName: 'createLastValueView',
    method: ViewManager.createLastValueView,
    metric: GaugeMetric,
    labelKeys,
    labelValues,
    values: [1, 5, 10, -10],
    results: [1, 5, 10, -10]
  },
  {
    methodName: 'createDistribuitionView',
    method: ViewManager.createDistribuitionView,
    metric: HistogramMetric,
    labelKeys,
    labelValues,
    values: [63, 89, 78, 90, 95],
    results: [63, 95, 415, 83, 654]  // min,max,sum,mean,sumSqrDeviations
  }
];

function checkSnapshotSingleValue(value: SingleValue, result: number) {
  assert.strictEqual(value.value, result);
}
function checkSnapshotDistribution(value: Distribution, result: number[]) {
  assert.strictEqual(value.min, result[0]);
  assert.strictEqual(value.max, result[1]);
  assert.strictEqual(value.sum, result[2]);
  assert.strictEqual(value.mean, result[3]);
  assert.strictEqual(value.sumSquaredDeviations, result[4]);
}


describe('ViewManager', function() {
  let measure: Measure;
  let view: View;

  describe('created views', () => {
    beforeEach(
        () => measure = MeasureManager.createMeasureInt64(
            'opencensus.io/stats/count', 'description', MeasureUnit.unit));

    viewManagerCreateMethodList.forEach((method) => {
      it(`should create ${method.methodName} with same name as measure`, () => {
        const args = [measure];
        view = method.method.apply(this, args);
        assert.strictEqual(view.name, measure.name);
        assert.strictEqual(view.description, measure.description);
        assert.ok(view.metric instanceof method.metric);
      });

      it(`should create ${method.methodName} with different name from measure`,
         () => {
           const viewname = 'opencensus.io/view/myview';
           const description = 'myDescription';
           // tslint:disable-next-line:no-any
           let args: any = [measure, [], viewname, description];
           if (method.methodName === 'createDistribuitionView') {
             args = [measure, [], [], viewname, description];
           }
           view = method.method.apply(this, args);
           assert.notStrictEqual(view.name, measure.name);
           assert.notStrictEqual(view.description, measure.description);
           assert.ok(view.metric instanceof method.metric);
         });
    });
  });

  describe('record values and check results', () => {
    beforeEach(
        () => measure = MeasureManager.createMeasureDouble(
            'opencensus.io/stats/latency', 'description', MeasureUnit.sec));

    viewManagerCreateMethodList.forEach((method) => {
      it(`should create ${method.methodName} with same name as measure`, () => {
        const args = [measure, method.labelKeys];
        view = method.method.apply(this, args);

        for (let i = 0; i < method.values.length; i++) {
          const value = method.values[i];
          const result = method.results[i];
          view.recordValue(method.labelValues, value);
          const recordValue = view.getSnapshotValue(method.labelValues);
          if (recordValue.type === MetricValuesTypes.SINGLE) {
            checkSnapshotSingleValue(recordValue as SingleValue, result);
          }
        }
        if (method.methodName === 'createDistribuitionView') {
          const recordValue = view.getSnapshotValue(method.labelValues);
          checkSnapshotDistribution(
              recordValue as Distribution, method.results);
        }
      });
    });
  });

  describe('register views', () => {
    beforeEach(() => {
      measure = MeasureManager.createMeasureInt64(
          'opencensus.io/stats/size', 'description', MeasureUnit.byte);
      ViewManager.clearRegister();
    });

    viewManagerCreateMethodList.forEach((method) => {
      it(`should create ${method.methodName} and register a view`, () => {
        assert.strictEqual(Object.keys(ViewManager.registeredViews).length, 0);
        const args = [measure];
        view = method.method.apply(this, args);
        assert.strictEqual(view.registered, false);
        ViewManager.registerView(view);
        assert.strictEqual(view.registered, true);
        assert.strictEqual(Object.keys(ViewManager.registeredViews).length, 1);
        assert.strictEqual(ViewManager.getView(view.name), view);
        assert.strictEqual(ViewManager.getViews(measure)[0], view);
        assert.ok(view.metric instanceof method.metric);
      });
    });
  });
});
