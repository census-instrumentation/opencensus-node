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

import { metricProducerManagerInstance } from './export/metric-producer-manager';
import { MetricRegistry } from './metric-registry';

/**
 * Class that holds the implementation instance for MetricRegistry.
 */
export class MetricsComponent {
  private metricRegistry: MetricRegistry;

  constructor() {
    this.metricRegistry = new MetricRegistry();

    // Register the MetricRegistry's MetricProducer to the global
    // MetricProducerManager.
    metricProducerManagerInstance.add(this.metricRegistry.getMetricProducer());
  }

  /**
   * Returns the MetricRegistry.
   *
   * @return {MetricRegistry}.
   */
  getMetricRegistry(): MetricRegistry {
    return this.metricRegistry;
  }
}
