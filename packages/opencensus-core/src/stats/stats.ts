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

import * as defaultLogger from '../common/console-logger';
import * as loggerTypes from '../common/types';
import { StatsEventListener } from '../exporters/types';
import * as cls from '../internal/cls';
import { Metric } from '../metrics/export/types';
import { Metrics } from '../metrics/metrics';
import { TagMap } from '../tags/tag-map';
import * as tagger from '../tags/tagger';
import { TagKey } from '../tags/types';
import { MetricProducerForStats } from './metric-producer';
import {
  AggregationType,
  Measure,
  Measurement,
  MeasureType,
  MeasureUnit,
  Stats,
  View,
} from './types';
import { BaseView } from './view';

export class BaseStats implements Stats {
  /** A list of Stats exporters */
  private statsEventListeners: StatsEventListener[] = [];
  /** A map of Measures (name) to their corresponding Views */
  private registeredViews: { [key: string]: View[] } = {};
  /** An object to log information to */
  private logger: loggerTypes.Logger;
  /** Singleton instance */
  private static singletonInstance: BaseStats;
  /** Manage context automatic propagation */
  private contextManager: cls.Namespace;

  /**
   * Creates stats
   * @param logger
   */
  constructor(logger = defaultLogger) {
    this.logger = logger.logger();
    this.contextManager = cls.getNamespace();

    // Create a new MetricProducerForStats and register it to
    // MetricProducerManager when Stats is initialized.
    const metricProducer = new MetricProducerForStats(this);
    Metrics.getMetricProducerManager().add(metricProducer);
  }

  /** Gets the stats instance. */
  static get instance(): Stats {
    return this.singletonInstance || (this.singletonInstance = new this());
  }

  /**
   * Registers a view to listen to new measurements in its measure.
   * @param view The view to be registered
   */
  registerView(view: View): void {
    if (this.registeredViews[view.measure.name]) {
      this.registeredViews[view.measure.name].push(view);
    } else {
      this.registeredViews[view.measure.name] = [view];
    }

    view.registered = true;

    // Notifies all exporters
    for (const exporter of this.statsEventListeners) {
      // tslint:disable-next-line:deprecation
      exporter.onRegisterView(view);
    }
  }

  /**
   * Creates a view.
   * @param name The view name
   * @param measure The view measure
   * @param aggregation The view aggregation type
   * @param tagKeys The view columns (tag keys)
   * @param description The view description
   * @param bucketBoundaries An optional The view bucket boundaries for a
   *     distribution aggregation type
   */
  createView(
    name: string,
    measure: Measure,
    aggregation: AggregationType,
    tagKeys: TagKey[],
    description: string,
    bucketBoundaries?: number[]
  ): View {
    const view = new BaseView(
      name,
      measure,
      aggregation,
      tagKeys,
      description,
      bucketBoundaries
    );
    return view;
  }

  /**
   * Registers an exporter to send stats data to a service.
   * @param exporter An stats exporter
   */
  registerExporter(exporter: StatsEventListener): void {
    this.statsEventListeners.push(exporter);

    for (const measureName of Object.keys(this.registeredViews)) {
      for (const view of this.registeredViews[measureName]) {
        // tslint:disable-next-line:deprecation
        exporter.onRegisterView(view);
      }
    }
    exporter.start();
  }

  /**
   * Unregisters an exporter. It should be called whenever the exporter is not
   * needed anymore.
   * @param exporter An stats exporter
   */
  unregisterExporter(exporter: StatsEventListener): void {
    if (exporter) {
      this.statsEventListeners = this.statsEventListeners.filter(
        currentExporter => currentExporter !== exporter
      );
      exporter.stop();
    }
  }

  /**
   * Creates a measure of type Double.
   * @param name The measure name
   * @param unit The measure unit
   * @param description An optional measure description
   */
  createMeasureDouble(
    name: string,
    unit: MeasureUnit,
    description?: string
  ): Measure {
    return { name, unit, type: MeasureType.DOUBLE, description };
  }

  /**
   * Creates a measure of type Int64. Values must be integers up to
   * Number.MAX_SAFE_INTERGER.
   * @param name The measure name
   * @param unit The measure unit
   * @param description An optional measure description
   */
  createMeasureInt64(
    name: string,
    unit: MeasureUnit,
    description?: string
  ): Measure {
    return { name, unit, type: MeasureType.INT64, description };
  }

  /**
   * Verifies whether all measurements has positive value
   * @param measurements A list of measurements
   * @returns Whether values is positive
   */
  private hasNegativeValue(measurements: Measurement[]): boolean {
    return measurements.some(measurement => measurement.value < 0);
  }

  /**
   * Gets a collection of produced Metric`s to be exported.
   * @returns The List of metrics.
   */
  getMetrics(): Metric[] {
    const metrics: Metric[] = [];

    for (const measureName of Object.keys(this.registeredViews)) {
      for (const view of this.registeredViews[measureName]) {
        metrics.push(view.getMetric(view.startTime));
      }
    }

    return metrics;
  }

  /**
   * Updates all views with the new measurements.
   * @param measurements A list of measurements to record
   * @param tags optional The tags to which the value is applied.
   *     tags could either be explicitly passed to the method, or implicitly
   *     read from current execution context.
   * @param attachments optional The contextual information associated with an
   *     example value. THe contextual information is represented as key - value
   *     string pairs.
   */
  record(
    measurements: Measurement[],
    tags?: TagMap,
    attachments?: { [key: string]: string }
  ): void {
    if (this.hasNegativeValue(measurements)) {
      this.logger.warn(`Dropping measurments ${measurements}, value to record
          must be non-negative.`);
      return;
    }

    if (!tags) {
      // Record against implicit (current) context
      tags = this.getCurrentTagContext();
    }

    for (const measurement of measurements) {
      const views = this.registeredViews[measurement.measure.name];
      if (!views) {
        break;
      }
      // Updates all views
      for (const view of views) {
        view.recordMeasurement(measurement, tags, attachments);
      }

      // Notifies all exporters
      for (const exporter of this.statsEventListeners) {
        // tslint:disable-next-line:deprecation
        exporter.onRecord(views, measurement, tags.tags);
      }
    }
  }

  /**
   * Remove all registered Views and exporters from the stats.
   */
  clear(): void {
    this.registeredViews = {};
    this.statsEventListeners = [];
  }

  /**
   * Enters the scope of code where the given `TagMap` is in the current context
   * (replacing the previous `TagMap`).
   * @param tags The TagMap to be set to the current context.
   * @param fn Callback function.
   * @returns The callback return.
   */
  withTagContext<T>(tags: TagMap, fn: cls.Func<T>): T {
    return tagger.withTagContext<T>(this.contextManager, tags, fn);
  }

  /** Gets the current tag context. */
  getCurrentTagContext(): TagMap {
    return tagger.getCurrentTagContext(this.contextManager);
  }
}
