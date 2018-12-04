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

import {AggregationType, Measure, MeasureType, MeasureUnit, Stats, Tags, View} from '../src';
import {MetricDescriptorType} from '../src/metrics/export/types';
import {MetricProducerForStats} from '../src/stats/metric-producer';

describe('Metric producer for stats', () => {
  interface AggregationTestCase {
    aggregationType: AggregationType;
    description: string;
    metricDescriptorType: MetricDescriptorType;
  }
  const aggregationTestCases: AggregationTestCase[] = [
    {
      aggregationType: AggregationType.SUM,
      description: 'Sum',
      metricDescriptorType: MetricDescriptorType.CUMULATIVE_DOUBLE
    },
    {
      aggregationType: AggregationType.COUNT,
      description: 'Count',
      metricDescriptorType: MetricDescriptorType.CUMULATIVE_INT64
    },
    {
      aggregationType: AggregationType.LAST_VALUE,
      description: 'Last Value',
      metricDescriptorType: MetricDescriptorType.GAUGE_DOUBLE
    },
    {
      aggregationType: AggregationType.DISTRIBUTION,
      description: 'Distribution',
      metricDescriptorType: MetricDescriptorType.CUMULATIVE_DISTRIBUTION
    }
  ];
  const measure: Measure = {
    name: 'Test Measure',
    type: MeasureType.DOUBLE,
    unit: MeasureUnit.UNIT
  };

  let stats: Stats;
  let metricProducerForStats: MetricProducerForStats;

  beforeEach(() => {
    stats = new Stats();
    metricProducerForStats = new MetricProducerForStats(stats);
  });

  describe('Metric producer', () => {
    const tags: Tags = {testKey1: 'testValue', testKey2: 'testValue'};
    const measurementValues = [1.1, 2.3, 3.2, 4.3, 5.2];
    const buckets = [2, 4, 6];

    describe('getMetrics()', () => {
      // Detailed coverage in test-viev.ts
      for (const aggregation of aggregationTestCases) {
        it(`should return list of metrics for ${
               aggregation.aggregationType} aggregation`,
           () => {
             const view: View = stats.createView(
                 'test/view/name', measure, aggregation.aggregationType,
                 Object.keys(tags), 'test description', buckets);
             for (const value of measurementValues) {
               const measurement = {measure, tags, value};
               view.recordMeasurement(measurement);
             }

             const metrics = metricProducerForStats.getMetrics();

             assert.strictEqual(metrics.length, 1);
             const [{descriptor, timeseries}] = metrics;

             assert.deepStrictEqual(descriptor, {
               name: 'test/view/name',
               description: 'test description',
               'labelKeys': [{'key': 'testKey1'}, {'key': 'testKey2'}],
               unit: MeasureUnit.UNIT,
               type: aggregation.metricDescriptorType,
             });
             assert.strictEqual(timeseries.length, 1);
           });
      }
    });
  });
});