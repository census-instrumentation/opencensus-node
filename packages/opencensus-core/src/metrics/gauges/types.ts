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

import {MeasureUnit} from '../../stats/types';
import {LabelKey, LabelValue, Metric, TimeSeries, Timestamp} from '../export/types';

export interface Meter {
  /**
   * Provides a Metric with one or more TimeSeries.
   *
   * @returns {Metric} The Metric.
   */
  getMetric(): Metric|null;
}

export interface Point {
  /**
   * Adds the given value to the current value. The values can be negative.
   *
   * @param {number} amt The value to add.
   */
  add(amt: number): void;

  /**
   * Sets the given value.
   *
   * @param {number} val The new value.
   */
  set(val: number): void;

  /**
   * Returns the TimeSeries with one or more Point.
   *
   * @param {Timestamp} timestamp The time at which the gauge is recorded.
   * @returns {TimeSeries} The TimeSeries.
   */
  getTimeSeries(timestamp: Timestamp): TimeSeries;
}

/** Options for every metric added to the MetricRegistry. */
export interface MetricOptions {
  /** The description of the metric. */
  readonly description?: string;
  /** The unit of the metric. */
  readonly unit?: MeasureUnit;
  /** The list of the label keys. */
  readonly labelKeys?: LabelKey[];
  /** The map of constant labels for the Metric. */
  readonly constantLabels?: Map<LabelKey, LabelValue>;

  // TODO(mayurkale): Add resource information.
  // https://github.com/census-instrumentation/opencensus-specs/pull/248
}
