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

import * as logger from '../../common/console-logger';
import * as loggerTypes from '../../common/types';
import {ConsoleStatsExporter} from '../../exporters/console-exporter';
import {StatsExporter} from '../../exporters/types';

import {AggregationCount, AggregationDistribution, AggregationLastValue, AggregationSum} from './aggregation';
import {Aggregation, Measure, Measurement, RecordedMeasurements, RegisteredViews, Stats, View} from './types';

/** Type for restered measures */
type RegisteredMeasures = {
  [key: string]: Measure;
};

/** Manager the main stats actions */
export class StatsManager implements Stats {
  private logger: loggerTypes.Logger;
  private registeredViews: RegisteredViews;
  private registeredMeasures: RegisteredMeasures;
  private exporter: StatsExporter;
  private recordedMeasurements: RecordedMeasurements;

  constructor(userLogger?: loggerTypes.Logger) {
    this.logger = userLogger ? userLogger : logger.logger();
    this.registeredViews = {};
    this.registeredMeasures = {};
    this.recordedMeasurements = {};
    this.exporter = new ConsoleStatsExporter();
  }

  /**
   * Register a exporter to stats instance
   * @param exporter
   */
  registerExporter(exporter: StatsExporter): void {
    this.exporter = exporter;
  }

  /**
   * Enable stats collection for the given {@link View}.
   * @param view
   */
  registerView(view: View): void {
    const existingView = this.registeredViews[view.name];
    if (existingView) {
      this.logger.warn(
          'A view with the same name is already registered: %o', existingView);
      return;
    }

    const measure = view.measure;
    const existingMeasure = this.registeredMeasures[measure.name];
    if (existingMeasure) {
      this.logger.warn(
          'A measure with the same name is already registered: %o',
          existingMeasure);
      return;
    }

    if (!view.startTime) {
      view.startTime = new Date();
    }
    if (!view.endTime) {
      view.endTime = new Date();
    }

    this.registeredViews[view.name] = view;
    this.registeredMeasures[measure.name] = measure;

    this.exporter.onRegisterView(view, measure);
  }

  /**
   * Creates a new AggregationCount instance
   */
  createAggregationCount(): Aggregation {
    return new AggregationCount();
  }

  /**
   * Creates a new aggregation instance
   */
  createAggregationSum(): Aggregation {
    return new AggregationSum();
  }

  /**
   * Creates a new AggregationLastValue instance
   */
  createAggregationLastValue(): Aggregation {
    return new AggregationLastValue();
  }

  /**
   * Creates a new AggregationDistribution instance
   * @param bucketBoundaries
   */
  createAggregationDistribution(bucketBoundaries: number[]): Aggregation {
    return new AggregationDistribution(bucketBoundaries.sort());
  }

  /**
   * Records values to measurements
   * @param measurements
   */
  record(...measurements: Measurement[]): void {
    for (const measurement of measurements) {
      for (const viewName of Object.keys(this.registeredViews)) {
        const view = this.registeredViews[viewName];
        // only record measurements with measure within a view
        if (view.measure === measurement.measure) {
          if (!this.recordedMeasurements[viewName]) {
            this.recordedMeasurements[viewName] = [];
          }
          this.recordedMeasurements[viewName].push(measurement);
          view.aggregation.measurements.push(measurement);
          this.exporter.onRecord(view, measurement);
          break;
        }
      }
    }
  }

  /**
   * Returns the registered views
   */
  getRegisteredViews(): RegisteredViews {
    return this.registeredViews;
  }

  /**
   * Returns the recorded measurements
   */
  getRecordedMeasurements(): RecordedMeasurements {
    return this.recordedMeasurements;
  }
}
