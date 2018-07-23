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

import {StatsEventListener} from '../exporters/types';

import {AggregationType} from './aggregation/types';
import {Measure, Measurement, MeasureUnit, View} from './types';

export class Stats {
  /** A list of Stats exporters */
  private statsEventListeners: StatsEventListener[] = [];
  /** A map of Measures (name) to their corresponding Views */
  private registeredViews: {[key: string]: View[]};

  constructor() {}

  /**
   * Registers a view to listen to new measurements in its measure. Prefer using
   * the method createView() that creates an already registered view.
   * @param view The view to be registered
   */
  registerView(view: View) {
    // TODO: To be implemented
  }

  /**
   * Creates and registers a view.
   * @param name The view name
   * @param measure The view measure
   * @param aggregation The view aggregation type
   * @param tagKeys The view columns (tag keys)
   * @param description The view description
   */
  createView(
      name: string, measure: Measure, aggregation: AggregationType,
      tagKeys: string[], description?: string): View {
    // TODO: To be implemented
    return null;
  }

  /**
   * Registers an exporter to send stats data to a service.
   * @param exporter An stats exporter
   */
  registerExporter(exporter: StatsEventListener) {
    // TODO: To be implemented
  }

  /**
   * Creates a measure of type Double.
   * @param name The measure name
   * @param unit The measure unit
   * @param description The measure description
   */
  createMeasureDouble(name: string, unit: MeasureUnit, description?: string):
      Measure {
    // TODO: To be implemented
    return null;
  }

  /**
   * Creates a measure of type Int64.
   * @param name The measure name
   * @param unit The measure unit
   * @param description The measure description
   */
  createMeasureInt(name: string, unit: MeasureUnit, description?: string):
      Measure {
    // TODO: To be implemented
    return null;
  }

  /**
   * Updates all views with the new measurements.
   * @param measurements A list of measurements to record
   */
  record(measurements: Measurement[]) {
    // TODO: To be implemented
  }
}