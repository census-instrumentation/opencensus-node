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

import { MeasureUnit } from './../stats/types';
import { LabelKey, LabelValue, Metric } from './export/types';

/** Provides a {@link Metric} with one or more {@link TimeSeries} */
export interface Meter {
  /**
   * Provides a Metric with one or more TimeSeries.
   *
   * @returns The Metric, or null if TimeSeries is not present in Metric.
   */
  getMetric(): Metric | null;
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

/** Interface for objects with "length()" method. */
export interface LengthMethodInterface {
  length(): number;
}

/** Interface for objects with "length" attribute (e.g. Array). */
export interface LengthAttributeInterface {
  length: number;
}

/** Interface for objects with "size" method. */
export interface SizeMethodInterface {
  size(): number;
}

/** Interface for objects with "size" attribute (e.g. Map, Set). */
export interface SizeAttributeInterface {
  size: number;
}

/** Interface for objects with "getValue" method. */
export interface ToValueInterface {
  getValue(): number;
}

export interface AccessorFunction {
  (): number;
}

export type AccessorInterface =
  | LengthAttributeInterface
  | LengthMethodInterface
  | SizeAttributeInterface
  | SizeMethodInterface
  | ToValueInterface
  | AccessorFunction;
