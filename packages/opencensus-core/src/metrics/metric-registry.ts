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

import {validateArrayElementsNotNull, validateNotNull} from '../common/validations';
import {MeasureUnit} from '../stats/types';
import {MetricProducer} from './export/metric-producer';
import {LabelKey, Metric, MetricDescriptorType} from './export/types';
import {Gauge} from './gauges/gauge';
import {Meter} from './gauges/types';

/**
 * Creates and manages application's set of metrics.
 */
export class MetricRegistry {
  private registeredMetrics: Map<string, Meter> = new Map();
  private metricProducer: MetricProducer;

  private static readonly NAME = 'name';
  private static readonly DESCRIPTION = 'description';
  private static readonly UNIT = 'unit';
  private static readonly LABEL_KEY = 'labelKey';
  private static readonly LABEL_KEYS = 'labelKeys';

  constructor() {
    this.metricProducer = new MetricProducerForRegistry(this.registeredMetrics);
  }

  /**
   * Builds a new Int64 gauge to be added to the registry. This is more
   * convenient form when you want to manually increase and decrease values as
   * per your service requirements.
   *
   * @param {string} name The name of the metric.
   * @param {string} description The description of the metric.
   * @param {MeasureUnit} unit The unit of the metric.
   * @param {LabelKey[]} labelKeys The list of the label keys.
   * @returns {Gauge} A Int64 Gauge metric.
   */
  addInt64Gauge(
      name: string, description: string, unit: MeasureUnit,
      labelKeys: LabelKey[]): Gauge {
    validateArrayElementsNotNull(
        validateNotNull(labelKeys, MetricRegistry.LABEL_KEYS),
        MetricRegistry.LABEL_KEY);

    const labelKeysCopy = Object.assign([], labelKeys);
    const int64Gauge = new Gauge(
        validateNotNull(name, MetricRegistry.NAME),
        validateNotNull(description, MetricRegistry.DESCRIPTION),
        validateNotNull(unit, MetricRegistry.UNIT),
        MetricDescriptorType.GAUGE_INT64, labelKeysCopy);
    this.registerMetric(name, int64Gauge);
    return int64Gauge;
  }

  /**
   * Builds a new double gauge to be added to the registry. This is more
   * convenient form when you want to manually increase and decrease values as
   * per your service requirements.
   *
   * @param {string} name The name of the metric.
   * @param {string} description The description of the metric.
   * @param {MeasureUnit} unit The unit of the metric.
   * @param {LabelKey[]} labelKeys The list of the label keys.
   * @returns {Gauge} A Double Gauge metric.
   */
  addDoubleGauge(
      name: string, description: string, unit: MeasureUnit,
      labelKeys: LabelKey[]): Gauge {
    validateArrayElementsNotNull(
        validateNotNull(labelKeys, MetricRegistry.LABEL_KEYS),
        MetricRegistry.LABEL_KEY);

    const labelKeysCopy = Object.assign([], labelKeys);
    const doubleGauge = new Gauge(
        validateNotNull(name, MetricRegistry.NAME),
        validateNotNull(description, MetricRegistry.DESCRIPTION),
        validateNotNull(unit, MetricRegistry.UNIT),
        MetricDescriptorType.GAUGE_DOUBLE, labelKeysCopy);
    this.registerMetric(name, doubleGauge);
    return doubleGauge;
  }

  /**
   * Builds a new derived Int64 gauge to be added to the registry. This is more
   * convenient form when you want to manually increase and decrease values as
   * per your service requirements.
   *
   * @param {string} name The name of the metric.
   * @param {string} description The description of the metric.
   * @param {MeasureUnit} unit The unit of the metric.
   * @param {LabelKey[]} labelKeys The list of the label keys.
   */
  addDerivedInt64Gauge(
      name: string, description: string, unit: MeasureUnit,
      labelKeys: LabelKey[]): void {
    validateNotNull(name, MetricRegistry.NAME);
    validateNotNull(description, MetricRegistry.DESCRIPTION);
    validateNotNull(unit, MetricRegistry.UNIT);
    validateArrayElementsNotNull(
        validateNotNull(labelKeys, MetricRegistry.LABEL_KEYS),
        MetricRegistry.LABEL_KEY);
    // TODO(mayurkale): Add Derived Int64Gauge.
  }

  /**
   * Builds a new derived double gauge to be added to the registry. This is more
   * convenient form when you want to manually increase and decrease values as
   * per your service requirements.
   *
   * @param {string} name The name of the metric.
   * @param {string} description The description of the metric.
   * @param {MeasureUnit} unit The unit of the metric.
   * @param {LabelKey[]} labelKeys The list of the label keys.
   */
  addDerivedDoubleGauge(
      name: string, description: string, unit: MeasureUnit,
      labelKeys: LabelKey[]): void {
    validateNotNull(name, MetricRegistry.NAME);
    validateNotNull(description, MetricRegistry.DESCRIPTION);
    validateNotNull(unit, MetricRegistry.UNIT);
    validateArrayElementsNotNull(
        validateNotNull(labelKeys, MetricRegistry.LABEL_KEYS),
        MetricRegistry.LABEL_KEY);
    // TODO(mayurkale): Add Derived DoubleGauge.
  }

  /**
   * Registers metric to register.
   *
   * @param {string} name The name of the metric.
   * @param {Meter} meter The metric to register.
   */
  private registerMetric(name: string, meter: Meter): void {
    if (this.registeredMetrics.has(name)) {
      throw new Error(
          `A metric with the name ${name} has already been registered.`);
    }
    this.registeredMetrics.set(name, meter);
  }

  /**
   * Gets a metric producer for registry.
   *
   * @returns {MetricProducer} The metric producer.
   */
  getMetricProducer(): MetricProducer {
    return this.metricProducer;
  }
}

/**
 * A MetricProducerForRegistry is a producer that can be registered for
 * exporting using MetricProducerManager.
 *
 * TODO (mayurkale): Add MetricProducerManager, that Keeps a set of
 *  MetricProducer that is used by exporters to determine the metrics that
 *  need to be exported.
 */
class MetricProducerForRegistry extends MetricProducer {
  private registeredMetrics: Map<string, Meter>;

  constructor(registeredMetrics: Map<string, Meter>) {
    super();
    this.registeredMetrics = registeredMetrics;
  }

  /**
   * Gets a collection of produced Metric`s to be exported.
   *
   * @returns {Metric[]} The list of metrics.
   */
  getMetrics(): Metric[] {
    return Array.from(
        this.registeredMetrics, ([_, meter]) => meter.getMetric());
  }
}
