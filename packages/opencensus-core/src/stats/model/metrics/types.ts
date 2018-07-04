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

import {Logger} from '../../..';
import {Measure, Measurement, Tags} from '../types';

/** Recorder mechanism used by a Metrics to record values */
export interface MetricRecorderMechanism<T> {
  record(value?: T, times?: number): void;
  reset(): void;
}

/**
 * The counter is a record mechanism that counts how many times an event occurs.
 * It cannot be decremented.
 */
export interface Counter<T> extends MetricRecorderMechanism<T> {
  // For count, record has the same behavior as increment
  /** Increments a counter n times */
  increment(times?: T): void;
  /** Current counter value */
  value: T;
  /** Last time counter was incremented */
  timestamp: number;
  /** When the counter was created */
  startTime: number;
  /** Same as timestamp */
  endTime: number;
}

/**
 * The gauge record a single value in a specific moment of time.
 * It can be incremented, decremented or set to a value.
 */
export interface Gauge<T> extends MetricRecorderMechanism<T> {
  // For gauges, record has the same behavior as set method
  /** Increments the gauge n times */
  increment(times?: T): void;
  /** Decrements the gauge n times */
  decrement(times?: T): void;
  /** Sets the gauge to value */
  set(value: T): void;
  /** Current gauge value */
  value: T;
  /** Last time gauge was updated */
  timestamp: number;
  /** When the gauge was created */
  startTime: number;
  /** Same as timestamp */
  endTime: number;
  /** Number of times the gauge was updated */
  count: number;
  /** Sum of all values seted */
  sum: T;
}

/**
 * Histograms can track the entire value distribution of a given metric.
 * Normally used for recording latency, sizes, and others.
 */
export interface Histogram extends MetricRecorderMechanism<number> {
  /**
   * Get the value at a given percentile.
   */
  getPercentile(percentile: number): number;
  /**  Add the contents of another histogram to this one. */
  add(otherHistogram: Histogram): void;
  /** Subtract the contents of another histogram to this one. */
  subtract(otherHistogram: Histogram): void;

  /** Snapshot Distribution value of the histogram */
  value: Distribution;
  /** When the histogram was created */
  startTime: number;
  /** Last time histogram was updated */
  endTime: number;
  /** Get the total count of all recorded values in the histogram */
  count: number;
  /** Sum of all recorded values in the histogram  */
  sum: number;
  /** Max value recorded in the histogram  */
  max: number;
  /** Min value recorded in the histogram  */
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
}


/**
 * MetricDescriptor defines a metric type and labelKeys
 */
export interface MetricDescriptor extends Measure { labelKeys: string[]; }

/**
 *  Defines a Metric which has one or more timeseries.
 */
export interface Metric<R> {
  /** Metric name */
  name: string;
  /** Descriptor of this metric */
  metricDescriptor: MetricDescriptor;
  /** Snapsot values of all labels for this metrics */
  metricSnapshotValues: MetricValues;
  /** Time the metric was created */
  startTime: number;
  /** list of all labelKeys */
  keys: string[];
  /** counter, gauge or histogram */
  type: string;
  /**
   * Add/update a label value and returns its metric record mechansim
   * associated to it
   */
  labelValues(labelValues: Tags|string[]): R;
  /**
   * Returns the metric record mechansim associated to the labelValue, if
   * existed
   */
  getRecorder(labelValues?: Tags|string[]): R;
  /** Converts a string[] of labelValues to a Tags representation */
  getTags(labelValues: string[]): Tags;
  /** Returns a hashkey from a tag valeu */
  getKey(aTags: Tags): string;
  /**
   * Reset metric to initial state - remove all label values and its records
   * mechanisms
   */
  reset(): void;
}

/** Maps that contains all labelValues -> Distribution of a Histogram Metric */
export type MetricDistributions = Distribution[];


/**
 * Maps that contains all labelValues -> Mensuremnt of a Count or Gouge Metric
 */
export type MetricSingleValues = SingleValue[];

/** A MetricDistributions or MetricSingleValues */
export type MetricValues = MetricSingleValues|MetricDistributions;

/** Type of MetricValues */
export const enum MetricValuesTypes {
  single,
  distribution
}

/**  Config for metrics */
export interface MetricConfig {
  /** Metric descripor  */
  descriptor: MetricDescriptor;
  /**
   * Only for gauges-  if true the value returned from snapshots will be the
   * sum and not the current gauge value
   */
  useSumAsValue?: boolean;
  /** logger instance */
  logger?: Logger;
}

/** Config for Histogram Metrics */
export interface HistogramMetricConfig extends MetricConfig {
  /** Histogram boundaries */
  boundaries: HistogramBoundaries;
}

/** A simple range used by a bucket */
export type SimpleRange = {
  /** Min value of the range */
  min: number,
  /** Max value of the range */
  max: number
};


/** The bucket boundaries for a histogram. */
export type HistogramBoundaries = {
  range: SimpleRange;
  /** List of numbers defining the boundaries for a histogram.  */
  bucketBoundaries: number[];
};

/** A simple bucket - a range and the number of occurrences in that range */
export interface Bucket {
  /** A range defining the boundaries of the bucket */
  range: SimpleRange;
  /** Number of occurrences in the range */
  count: number;
}

/** Snapshot distribution of a Histogram */
export type Distribution = {
  /** When the histogram was created */
  startTime: number;
  /** Last time histogram was updated */
  endTime: number;
  /** Get the total count of all recorded values in the histogram */
  count: number;
  /** Sum of all recorded values in the histogram  */
  sum: number;
  /** Max value recorded in the histogram  */
  max: number;
  /** Min value recorded in the histogram  */
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
   * histogram
   */
  sumSquaredDeviations: number;
  /** The bucket boundaries for a histogram. */
  boundaries: HistogramBoundaries;
  /** Bucket distribution of the histogram */
  buckets: Bucket[];
  /** Tags associated with this distribution */
  tags: Tags;
  /** type of value - distribuition */
  type: MetricValuesTypes;
  /** hash key of this distribution */
  labelKey: string;
};

/** Snapshot value of a Counter or Gauge */
export interface SingleValue {
  /** Timestamp related to the value */
  timestamp: number;
  /** The recorded value */
  value: number;
  /** Tags associated with this distribution */
  tags: Tags;
  /** type of value - single */
  type: MetricValuesTypes;
  /** hash key of this distribution */
  labelKey: string;
}
