/**
 * Copyright 2019, OpenCensus Authors
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
import { metricProducerManagerInstance } from '../src/metrics/export/metric-producer-manager';
import { MetricsComponent } from '../src/metrics/metric-component';
import { MetricRegistry } from '../src/metrics/metric-registry';

describe('MetricsComponent()', () => {
  let metricsComponent: MetricsComponent;

  beforeEach(() => {
    metricProducerManagerInstance.removeAll();
    metricsComponent = new MetricsComponent();
  });

  it('should return a MetricRegistry instance', () => {
    assert.ok(metricsComponent.getMetricRegistry() instanceof MetricRegistry);
  });

  it('should register metricRegistry to MetricProducerManger', () => {
    assert.strictEqual(
      metricProducerManagerInstance.getAllMetricProducer().size,
      1
    );
    assert.ok(
      metricProducerManagerInstance
        .getAllMetricProducer()
        .has(metricsComponent.getMetricRegistry().getMetricProducer())
    );
  });
});
