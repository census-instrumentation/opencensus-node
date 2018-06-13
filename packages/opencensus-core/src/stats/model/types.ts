import {StatsExporter} from '../../exporters/types';

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

/**  */
export interface RegisteredViews { [key: string]: View; }

/**  */
export interface RecordedMeasurements { [viewName: string]: Measurement[]; }

/** */
export interface HistogramBucket {
  range: {min: number, max: number};
  bucketCount: number;
}

/** Stats main class with manager actions */
export interface Stats {
  /**
   * Register a exporter to stats instance
   * @param exporter
   */
  registerExporter(exporter: StatsExporter): void;
  /**
   * Enable stats collection for the given View.
   * @param view
   */
  registerView(view: View): void;
  /**
   * Returns the registered views
   */
  getRegisteredViews(): RegisteredViews;
  /**
   * Returns the recorded measurements
   */
  getRecordedMeasurements(): RecordedMeasurements;
  /**
   * Creates a new AggregationCount instance
   */
  createAggregationCount(): Aggregation;
  /**
   * Creates a new AggregationSum instance
   */
  createAggregationSum(): Aggregation;
  /**
   * Creates a new AggregationLastValue instance
   */
  createAggregationLastValue(): Aggregation;
  /**
   * Creates a new AggregationDistribution instance
   * @param bucketBoundaries
   */
  createAggregationDistribution(bucketBoundaries: number[]): Aggregation;
  /**
   * Records values to measurements
   * @param measurements
   */
  record(...measurements: Measurement[]): void;
}

/** */
export interface Tags { [key: string]: string; }

/**
 * Describes the type of the individual values/measurements recorded by an
 * application. It includes information such as the type of measurement, the
 * units of measurement and descriptive names for the data. This provides the
 * fundamental type used for recording data.
 */
export interface Measure {
  /**
   * A string by which the measure will be referred to, e.g.
   * "rpc_server_latency". Names MUST be unique within the library.
   */
  name: string;
  /** Describes the measure, e.g. "RPC latency in seconds". */
  description: string;
  /**
   * Describes the unit used for the Measure. Follows the format described by
   * http://unitsofmeasure.org/ucum.html.
   */
  unit: string;
  /** The type used for this Measure. */
  type: string;
}

/**
 * Defines how individual measurements are broken down by tags and aggregated.
 */
export interface View {
  /**
   * A string by which the View will be referred to, e.g. "rpc_latency". Names
   * MUST be unique within the library.
   */
  name: string;
  /** Describes the view, e.g. "RPC latency distribution" */
  description: string;
  /** The Measure to which this view is applied. */
  measure: Measure;
  /**
   * An array of tags. These values associated with tags of this name form the
   * basis by which individual stats will be aggregated (one aggregation per
   * unique tag value). If none are provided, then all data is recorded in a
   * single aggregation.
   */
  columns: Tags;
  /** An Aggregation describes how data collected is aggregated */
  aggregation: Aggregation;
  /** The start time for this view */
  startTime: Date;
  /** The end time for this view */
  endTime: Date;
}

/** Determines how data collected is aggregated */
export interface Aggregation {
  /** Recorded measurements */
  measurements: Measurement[];
  /**
   * Gets the aggregation value
   */
  getValue(): number|HistogramBucket[];
  /**
   * Gets the aggregation type
   */
  getType(): string;
}

/** Describes a data point to be collected for a Measure. */
export interface Measurement {
  /** The measure to which the value is applied. */
  measure: Measure;
  /** The recorded value */
  value: number;
}
