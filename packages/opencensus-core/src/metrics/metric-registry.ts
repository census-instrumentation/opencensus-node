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

import { getTimestampWithProcessHRTime } from '../common/time-util';
import {
  validateArrayElementsNotNull,
  validateDuplicateKeys,
  validateMapElementNotNull,
  validateNotNull,
} from '../common/validations';
import { MeasureUnit } from '../stats/types';
import { Cumulative } from './cumulative/cumulative';
import { DerivedCumulative } from './cumulative/derived-cumulative';
import { BaseMetricProducer } from './export/base-metric-producer';
import {
  LabelKey,
  LabelValue,
  Metric,
  MetricDescriptorType,
  MetricProducer,
  Timestamp,
} from './export/types';
import { DerivedGauge } from './gauges/derived-gauge';
import { Gauge } from './gauges/gauge';
import { Meter, MetricOptions } from './types';

/**
 * Creates and manages application's set of metrics.
 */
export class MetricRegistry {
  private registeredMetrics: Map<string, Meter> = new Map();
  private metricProducer: MetricProducer;

  private static readonly NAME = 'name';
  private static readonly LABEL_KEY = 'labelKey';
  private static readonly CONSTANT_LABELS = 'constantLabels';
  private static readonly DEFAULT_DESCRIPTION = '';
  private static readonly DEFAULT_UNIT = MeasureUnit.UNIT;
  private static readonly DEFAULT_LABEL_KEYS = [];
  private static readonly DEFAULT_CONSTANT_LABEL = new Map();

  constructor() {
    this.metricProducer = new MetricProducerForRegistry(this.registeredMetrics);
  }

  /**
   * Builds a new Int64 gauge to be added to the registry. This is more
   * convenient form when you want to manually increase and decrease values as
   * per your service requirements.
   *
   * @param name The name of the metric.
   * @param options The options for the metric.
   * @returns A Int64 Gauge metric.
   */
  addInt64Gauge(name: string, options?: MetricOptions): Gauge {
    const description =
      (options && options.description) || MetricRegistry.DEFAULT_DESCRIPTION;
    const unit = (options && options.unit) || MetricRegistry.DEFAULT_UNIT;
    const labelKeys =
      (options && options.labelKeys) || MetricRegistry.DEFAULT_LABEL_KEYS;
    const constantLabels =
      (options && options.constantLabels) ||
      MetricRegistry.DEFAULT_CONSTANT_LABEL;
    // TODO(mayurkale): Add support for resource

    this.validateLables(labelKeys, constantLabels);

    const labelKeysCopy = Object.assign([], labelKeys);
    const int64Gauge = new Gauge(
      validateNotNull(name, MetricRegistry.NAME),
      description,
      unit,
      MetricDescriptorType.GAUGE_INT64,
      labelKeysCopy,
      constantLabels
    );
    this.registerMetric(name, int64Gauge);
    return int64Gauge;
  }

  /**
   * Builds a new double gauge to be added to the registry. This is more
   * convenient form when you want to manually increase and decrease values as
   * per your service requirements.
   *
   * @param name The name of the metric.
   * @param options The options for the metric.
   * @returns A Double Gauge metric.
   */
  addDoubleGauge(name: string, options?: MetricOptions): Gauge {
    const description =
      (options && options.description) || MetricRegistry.DEFAULT_DESCRIPTION;
    const unit = (options && options.unit) || MetricRegistry.DEFAULT_UNIT;
    const labelKeys =
      (options && options.labelKeys) || MetricRegistry.DEFAULT_LABEL_KEYS;
    const constantLabels =
      (options && options.constantLabels) ||
      MetricRegistry.DEFAULT_CONSTANT_LABEL;
    // TODO(mayurkale): Add support for resource

    this.validateLables(labelKeys, constantLabels);

    const labelKeysCopy = Object.assign([], labelKeys);
    const doubleGauge = new Gauge(
      validateNotNull(name, MetricRegistry.NAME),
      description,
      unit,
      MetricDescriptorType.GAUGE_DOUBLE,
      labelKeysCopy,
      constantLabels
    );
    this.registerMetric(name, doubleGauge);
    return doubleGauge;
  }

  /**
   * Builds a new derived Int64 gauge to be added to the registry. This is more
   * convenient form when you want to manually increase and decrease values as
   * per your service requirements.
   *
   * @param name The name of the metric.
   * @param options The options for the metric.
   * @returns A Int64 DerivedGauge metric.
   */
  addDerivedInt64Gauge(name: string, options?: MetricOptions): DerivedGauge {
    const description =
      (options && options.description) || MetricRegistry.DEFAULT_DESCRIPTION;
    const unit = (options && options.unit) || MetricRegistry.DEFAULT_UNIT;
    const labelKeys =
      (options && options.labelKeys) || MetricRegistry.DEFAULT_LABEL_KEYS;
    const constantLabels =
      (options && options.constantLabels) ||
      MetricRegistry.DEFAULT_CONSTANT_LABEL;
    // TODO(mayurkale): Add support for resource

    this.validateLables(labelKeys, constantLabels);

    const labelKeysCopy = Object.assign([], labelKeys);
    const derivedInt64Gauge = new DerivedGauge(
      validateNotNull(name, MetricRegistry.NAME),
      description,
      unit,
      MetricDescriptorType.GAUGE_INT64,
      labelKeysCopy,
      constantLabels
    );
    this.registerMetric(name, derivedInt64Gauge);
    return derivedInt64Gauge;
  }

  /**
   * Builds a new derived double gauge to be added to the registry. This is more
   * convenient form when you want to manually increase and decrease values as
   * per your service requirements.
   *
   * @param name The name of the metric.
   * @param options The options for the metric.
   * @returns A Double DerivedGauge metric.
   */
  addDerivedDoubleGauge(name: string, options?: MetricOptions): DerivedGauge {
    const description =
      (options && options.description) || MetricRegistry.DEFAULT_DESCRIPTION;
    const unit = (options && options.unit) || MetricRegistry.DEFAULT_UNIT;
    const labelKeys =
      (options && options.labelKeys) || MetricRegistry.DEFAULT_LABEL_KEYS;
    const constantLabels =
      (options && options.constantLabels) ||
      MetricRegistry.DEFAULT_CONSTANT_LABEL;
    // TODO(mayurkale): Add support for resource

    this.validateLables(labelKeys, constantLabels);

    const labelKeysCopy = Object.assign([], labelKeys);
    const derivedDoubleGauge = new DerivedGauge(
      validateNotNull(name, MetricRegistry.NAME),
      description,
      unit,
      MetricDescriptorType.GAUGE_DOUBLE,
      labelKeysCopy,
      constantLabels
    );
    this.registerMetric(name, derivedDoubleGauge);
    return derivedDoubleGauge;
  }

  /**
   * Builds a new Int64 cumulative to be added to the registry. This API is
   * useful when you want to manually increase and reset values as per service
   * requirements.
   *
   * @param name The name of the metric.
   * @param options The options for the metric.
   * @returns A Int64 Cumulative metric.
   */
  addInt64Cumulative(name: string, options?: MetricOptions): Cumulative {
    const description =
      (options && options.description) || MetricRegistry.DEFAULT_DESCRIPTION;
    const unit = (options && options.unit) || MetricRegistry.DEFAULT_UNIT;
    const labelKeys =
      (options && options.labelKeys) || MetricRegistry.DEFAULT_LABEL_KEYS;
    const constantLabels =
      (options && options.constantLabels) ||
      MetricRegistry.DEFAULT_CONSTANT_LABEL;
    // TODO(mayurkale): Add support for resource

    this.validateLables(labelKeys, constantLabels);

    const labelKeysCopy = Object.assign([], labelKeys);
    const int64Cumulative = new Cumulative(
      validateNotNull(name, MetricRegistry.NAME),
      description,
      unit,
      MetricDescriptorType.CUMULATIVE_INT64,
      labelKeysCopy,
      constantLabels
    );
    this.registerMetric(name, int64Cumulative);
    return int64Cumulative;
  }

  /**
   * Builds a new double cumulative to be added to the registry. This API is
   * useful when you want to manually increase and reset values as per service
   * requirements.
   *
   * @param name The name of the metric.
   * @param options The options for the metric.
   * @returns A Double Cumulative metric.
   */
  addDoubleCumulative(name: string, options?: MetricOptions): Cumulative {
    const description =
      (options && options.description) || MetricRegistry.DEFAULT_DESCRIPTION;
    const unit = (options && options.unit) || MetricRegistry.DEFAULT_UNIT;
    const labelKeys =
      (options && options.labelKeys) || MetricRegistry.DEFAULT_LABEL_KEYS;
    const constantLabels =
      (options && options.constantLabels) ||
      MetricRegistry.DEFAULT_CONSTANT_LABEL;
    // TODO(mayurkale): Add support for resource

    this.validateLables(labelKeys, constantLabels);

    const labelKeysCopy = Object.assign([], labelKeys);
    const doubleCumulative = new Cumulative(
      validateNotNull(name, MetricRegistry.NAME),
      description,
      unit,
      MetricDescriptorType.CUMULATIVE_DOUBLE,
      labelKeysCopy,
      constantLabels
    );
    this.registerMetric(name, doubleCumulative);
    return doubleCumulative;
  }

  /**
   * Builds a new derived Int64 Cumulative to be added to the registry.
   *
   * @param name The name of the metric.
   * @param options The options for the metric.
   * @returns A Int64 DerivedCumulative metric.
   */
  addDerivedInt64Cumulative(
    name: string,
    options?: MetricOptions
  ): DerivedCumulative {
    const description =
      (options && options.description) || MetricRegistry.DEFAULT_DESCRIPTION;
    const unit = (options && options.unit) || MetricRegistry.DEFAULT_UNIT;
    const labelKeys =
      (options && options.labelKeys) || MetricRegistry.DEFAULT_LABEL_KEYS;
    const constantLabels =
      (options && options.constantLabels) ||
      MetricRegistry.DEFAULT_CONSTANT_LABEL;
    // TODO(mayurkale): Add support for resource

    this.validateLables(labelKeys, constantLabels);

    const labelKeysCopy = Object.assign([], labelKeys);
    const startTime: Timestamp = getTimestampWithProcessHRTime();
    const derivedInt64Cumulative = new DerivedCumulative(
      validateNotNull(name, MetricRegistry.NAME),
      description,
      unit,
      MetricDescriptorType.CUMULATIVE_INT64,
      labelKeysCopy,
      constantLabels,
      startTime
    );
    this.registerMetric(name, derivedInt64Cumulative);
    return derivedInt64Cumulative;
  }

  /**
   * Builds a new derived Double Cumulative to be added to the registry.
   *
   * @param name The name of the metric.
   * @param options The options for the metric.
   * @returns A Double DerivedCumulative metric.
   */
  addDerivedDoubleCumulative(
    name: string,
    options?: MetricOptions
  ): DerivedCumulative {
    const description =
      (options && options.description) || MetricRegistry.DEFAULT_DESCRIPTION;
    const unit = (options && options.unit) || MetricRegistry.DEFAULT_UNIT;
    const labelKeys =
      (options && options.labelKeys) || MetricRegistry.DEFAULT_LABEL_KEYS;
    const constantLabels =
      (options && options.constantLabels) ||
      MetricRegistry.DEFAULT_CONSTANT_LABEL;
    // TODO(mayurkale): Add support for resource

    this.validateLables(labelKeys, constantLabels);

    const labelKeysCopy = Object.assign([], labelKeys);
    const startTime: Timestamp = getTimestampWithProcessHRTime();
    const derivedDoubleCumulative = new DerivedCumulative(
      validateNotNull(name, MetricRegistry.NAME),
      description,
      unit,
      MetricDescriptorType.CUMULATIVE_DOUBLE,
      labelKeysCopy,
      constantLabels,
      startTime
    );
    this.registerMetric(name, derivedDoubleCumulative);
    return derivedDoubleCumulative;
  }

  /**
   * Registers metric to register.
   *
   * @param name The name of the metric.
   * @param meter The metric to register.
   */
  private registerMetric(name: string, meter: Meter): void {
    if (this.registeredMetrics.has(name)) {
      throw new Error(
        `A metric with the name ${name} has already been registered.`
      );
    }
    this.registeredMetrics.set(name, meter);
  }

  /**
   * Gets a metric producer for registry.
   *
   * @returns The metric producer.
   */
  getMetricProducer(): MetricProducer {
    return this.metricProducer;
  }

  /** Validates labelKeys and constantLabels. */
  private validateLables(
    labelKeys: LabelKey[],
    constantLabels: Map<LabelKey, LabelValue>
  ) {
    validateArrayElementsNotNull(labelKeys, MetricRegistry.LABEL_KEY);
    validateMapElementNotNull(constantLabels, MetricRegistry.CONSTANT_LABELS);
    validateDuplicateKeys(labelKeys, constantLabels);
  }
}

/**
 * A MetricProducerForRegistry is a producer that can be registered for
 * exporting using MetricProducerManager.
 */
class MetricProducerForRegistry extends BaseMetricProducer {
  private registeredMetrics: Map<string, Meter>;

  constructor(registeredMetrics: Map<string, Meter>) {
    super();
    this.registeredMetrics = registeredMetrics;
  }

  /**
   * Gets a collection of produced Metric`s to be exported.
   *
   * @returns The list of metrics.
   */
  getMetrics(): Metric[] {
    return Array.from(this.registeredMetrics.values())
      .map(meter => meter.getMetric())
      .filter(meter => !!meter) as Metric[];
  }
}
