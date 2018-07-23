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

import {Measurement, Tags} from '../types';

/**
 * Informs the type of the aggregation. It can be: count, sum, lastValue or
 * distribution.
 */
export const enum AggregationType {
  count = 0,
  sum = 1,
  lastValue = 2,
  distribution = 3
}

/** Defines how data is collected and aggregated */
export interface AggregationData {
  /** The aggregation type of the aggregation data */
  readonly type: AggregationType;
  /** The tags/labels that this AggregationData collects and aggregates */
  readonly tags: Tags;
  /** The latest timestamp a new data point was recorded */
  timestamp: number;
  /**
   * Adds a new data point to the aggregation.
   * @param measurement The new data point to aggregate
   */
  addMeasurement(measurement: Measurement): void;
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
  /** The bucket boundaries for a histogram */
  readonly bucketsBoundaries: number[];
}

/** A simple histogram bucket interface. */
export interface Bucket {
  /** Number of occurrences in the domain */
  count: number;
  /** The maximum bucket limit in domain */
  readonly max: number;
  /** The minimum bucket limit in domain */
  readonly min: number;
}
