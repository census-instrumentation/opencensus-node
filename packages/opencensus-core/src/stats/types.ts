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

/** Tags are maps of names -> values */
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
  readonly name: string;
  /** Describes the measure, e.g. "RPC latency in seconds". */
  readonly description?: string;
  /**
   * Describes the unit used for the Measure. Follows the format described by
   * http://unitsofmeasure.org/ucum.html.
   */
  readonly unit: MeasureUnit;
  /** The type used for this Measure. */
  readonly type: MeasureType;
}

/**
 * Describes the unit used for the Measure. Should follows the format described
 * by http://unitsofmeasure.org/ucum.html.
 */
export const enum MeasureUnit {
  UNIT = '1',    // for general counts
  BYTE = 'by',   // bytes
  KBYTE = 'kb',  // Kbytes
  SEC = 's',     // seconds
  MS = 'ms',     // millisecond
  NS = 'ns'      // nanosecond
}

/** Describes the types of a Measure. It can be Int64 or a Double type. */
export const enum MeasureType {
  INT64 = 'INT64',
  DOUBLE = 'DOUBLE'
}

/** Describes a data point to be collected for a Measure. */
export interface Measurement {
  /** The measure to which the value is applied */
  readonly measure: Measure;
  /**
   * The recorded value. If the measure has type INT64, value must be an integer
   * up to Number.MAX_SAFE_INTERGER.
   */
  readonly value: number;
  /** The tags to which the value is applied */
  readonly tags: Tags;
}

/**
 * Defines how individual measurements are broken down by tags and aggregated.
 */
export interface View {
  /**
   * A string by which the View will be referred to, e.g. "rpc_latency". Names
   * MUST be unique within the library.
   */
  readonly name: string;
  /** Describes the view, e.g. "RPC latency distribution" */
  readonly description?: string;
  /** The Measure to which this view is applied. */
  readonly measure: Measure;
  /**
   * An Aggregation describes how data collected is aggregated.
   * There are four aggregation types: count, sum, lastValue and distirbution.
   */
  readonly aggregation: AggregationType;
  /** The start time for this view */
  readonly startTime: number;
  /**
   * The end time for this view - represents the last time a value was recorded
   */
  endTime: number;
  /** true if the view was registered */
  registered: boolean;
  /**  Returns a snapshot of an AggregationData for that tags/labels values */
  getSnapshot(tags: Tags): AggregationData;
  /** Returns a list of all AggregationData in the view */
  getSnapshots(): AggregationData[];
}

/**
 * Informs the type of the aggregation. It can be: count, sum, lastValue or
 * distribution.
 */
export const enum AggregationType {
  COUNT = 0,
  SUM = 1,
  LAST_VALUE = 2,
  DISTRIBUTION = 3
}

/** Defines how data is collected and aggregated */
export interface AggregationData {
  /** The aggregation type of the aggregation data */
  readonly type: AggregationType;
  /** The tags/labels that this AggregationData collects and aggregates */
  readonly tags: Tags;
  /** The latest timestamp a new data point was recorded */
  timestamp: number;
}

/**
 * Data collected and aggregated with this AggregationData will be summed up.
 */
export interface SumData extends AggregationData {
  /** The current accumulated value */
  value: number;
}

/**
 * This AggregationData counts the number of measurements recorded.
 */
export interface CountData extends AggregationData {
  /** The current counted value */
  value: number;
}

/**
 * This AggregationData represents the last recorded value. This is useful when
 * giving support to Gauges.
 */
export interface LastValueData extends AggregationData {
  /** The last recorded value */
  value: number;
}

/** This AggregationData contains a histogram of the collected values. */
export interface DistributionData extends AggregationData {
  /** The first timestamp a datapoint was added */
  readonly startTime: number;
  /** Get the total count of all recorded values in the histogram */
  count: number;
  /** Sum of all recorded values in the histogram */
  sum: number;
  /** Max value recorded in the histogram */
  max: number;
  /** Min value recorded in the histogram */
  min: number;
  /** Get the computed mean value of all recorded values in the histogram */
  mean: number;
  /**
   * Get the computed standard deviation of all recorded values in the
   * histogram
   */
  stdDeviation: number;
  /**
   * Get the computed sum of squared deviations of all recorded values in the
   * histogram.
   */
  sumSquaredDeviations: number;
  /** Bucket distribution of the histogram */
  buckets: Bucket[];
}

/** A simple histogram bucket interface. */
export interface Bucket {
  /** Number of occurrences in the domain */
  count: number;
  /** The maximum bucket limit in domain */
  readonly highBoundary: number;
  /** The minimum bucket limit in domain */
  readonly lowBoundary: number;
}
