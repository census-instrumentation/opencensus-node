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

import { metricProducerManagerInstance } from './export/metric-producer-manager';
import { MetricProducerManager } from './export/types';
import { MetricsComponent } from './metric-component';
import { MetricRegistry } from './metric-registry';

/**
 * Class for accessing the default MetricsComponent.
 */
export class Metrics {
  private static readonly METRIC_COMPONENT = new MetricsComponent();

  /** @return {MetricProducerManager} The global MetricProducerManager. */
  static getMetricProducerManager(): MetricProducerManager {
    return metricProducerManagerInstance;
  }

  /** @return {MetricRegistry} The global MetricRegistry. */
  static getMetricRegistry(): MetricRegistry {
    return Metrics.METRIC_COMPONENT.getMetricRegistry();
  }
}
