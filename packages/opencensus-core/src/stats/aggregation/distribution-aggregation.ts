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

import {AggregationType, Bucket, DistributionData} from './types';

export class DistributionAggregation implements DistributionData {
  /** The aggregation type of the aggregation data */
  readonly type: AggregationType;
  /** The tags/labels that this AggregationData collects and aggregates */
  readonly tags: Tags;
  /** The latest timestamp a new data point was recorded */
  timestamp: number;
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

  constructor() {}

  addMeasurement(measurement: Measurement): void {
    // TODO: To be implemented
  }
}