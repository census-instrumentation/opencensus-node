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

import {Recorder} from './recorder';
import {AggregationData, AggregationMetadata, AggregationType, Bucket, CountData, DistributionData, LastValueData, Measure, Measurement, MeasureType, SumData, Tags, View} from './types';

const RECORD_SEPARATOR = String.fromCharCode(30);
const UNIT_SEPARATOR = String.fromCharCode(31);

// String that has only printable characters
const invalidString = /[^\u0020-\u007e]/;

export class BaseView implements View {
  /**
   * A string by which the View will be referred to, e.g. "rpc_latency". Names
   * MUST be unique within the library.
   */
  readonly name: string;
  /** Describes the view, e.g. "RPC latency distribution" */
  readonly description: string;
  /** The Measure to which this view is applied. */
  readonly measure: Measure;
  /**
   * A map of stringified tags representing columns labels or tag keys, concept
   * similar to dimensions on multidimensional modeling, to AggregationData.
   * If no Tags are provided, then, all data is recorded in a single
   * aggregation.
   */
  private rows: {[key: string]: AggregationData} = {};
  /**
   * A list of tag keys that represents the possible column labels
   */
  private columns: string[];
  /**
   * An Aggregation describes how data collected is aggregated.
   * There are four aggregation types: count, sum, lastValue and distirbution.
   */
  readonly aggregation: AggregationType;
  /** The start time for this view */
  readonly startTime: number;
  /** The bucket boundaries in a Distribution Aggregation */
  private bucketBoundaries?: number[];
  /**
   * The end time for this view - represents the last time a value was recorded
   */
  endTime: number;
  /** true if the view was registered */
  registered = false;

  /**
   * Creates a new View instance. This constructor is used by Stats. User should
   * prefer using Stats.createView() instead.
   * @param name The view name
   * @param measure The view measure
   * @param aggregation The view aggregation type
   * @param tagsKeys The Tags' keys that view will have
   * @param description The view description
   * @param bucketBoundaries The view bucket boundaries for a distribution
   * aggregation type
   */
  constructor(
      name: string, measure: Measure, aggregation: AggregationType,
      tagsKeys: string[], description: string, bucketBoundaries?: number[]) {
    if (aggregation === AggregationType.DISTRIBUTION && !bucketBoundaries) {
      throw new Error('No bucketBoundaries specified');
    }
    this.name = name;
    this.description = description;
    this.measure = measure;
    this.columns = tagsKeys;
    this.aggregation = aggregation;
    this.startTime = Date.now();
    this.bucketBoundaries = bucketBoundaries;
  }

  /** Gets the view's tag keys */
  getColumns(): string[] {
    return this.columns;
  }

  /**
   * Records a measurement in the proper view's row. This method is used by
   * Stats. User should prefer using Stats.record() instead.
   *
   * Measurements with measurement type INT64 will have its value truncated.
   * @param measurement The measurement to record
   */
  recordMeasurement(measurement: Measurement) {
    // Checks if measurement has valid tags
    if (this.invalidTags(measurement.tags)) {
      return;
    }

    // Checks if measurement has all tags in views
    for (const tagKey of this.columns) {
      if (!Object.keys(measurement.tags).some((key) => key === tagKey)) {
        return;
      }
    }

    const encodedTags = this.encodeTags(measurement.tags);
    if (!this.rows[encodedTags]) {
      this.rows[encodedTags] = this.createAggregationData(measurement.tags);
    }
    Recorder.addMeasurement(this.rows[encodedTags], measurement);
  }

  /**
   * Encodes a Tags object into a key sorted string.
   * @param tags The tags to encode
   */
  private encodeTags(tags: Tags): string {
    return Object.keys(tags)
        .sort()
        .map(tagKey => {
          return tagKey + UNIT_SEPARATOR + tags[tagKey];
        })
        .join(RECORD_SEPARATOR);
  }

  /**
   * Checks if tag keys and values have only printable characters.
   * @param tags The tags to be checked
   */
  private invalidTags(tags: Tags): boolean {
    return Object.keys(tags).some(tagKey => {
      return invalidString.test(tagKey) || invalidString.test(tags[tagKey]);
    });
  }

  /**
   * Creates an empty aggregation data for a given tags.
   * @param tags The tags for that aggregation data
   */
  private createAggregationData(tags: Tags): AggregationData {
    const aggregationMetadata = {tags, timestamp: Date.now()};

    switch (this.aggregation) {
      case AggregationType.DISTRIBUTION:
        return {
          ...aggregationMetadata,
          type: AggregationType.DISTRIBUTION,
          startTime: this.startTime,
          count: 0,
          sum: 0,
          max: Number.MIN_SAFE_INTEGER,
          min: Number.MAX_SAFE_INTEGER,
          mean: null as number,
          stdDeviation: null as number,
          sumSquaredDeviations: null as number,
          buckets: this.createBuckets(this.bucketBoundaries)
        };
      case AggregationType.SUM:
        return {...aggregationMetadata, type: AggregationType.SUM, value: 0};
      case AggregationType.COUNT:
        return {...aggregationMetadata, type: AggregationType.COUNT, value: 0};
      default:
        return {
          ...aggregationMetadata,
          type: AggregationType.LAST_VALUE,
          value: undefined
        };
    }
  }

  /**
   * Creates empty Buckets, given a list of bucket boundaries.
   * @param bucketBoundaries a list with the bucket boundaries
   */
  private createBuckets(bucketBoundaries: number[]): Bucket[] {
    return bucketBoundaries.map((boundary, boundaryIndex) => {
      return {
        count: 0,
        lowBoundary: boundaryIndex ? boundary : -Infinity,
        highBoundary: (boundaryIndex === bucketBoundaries.length - 1) ?
            Infinity :
            bucketBoundaries[boundaryIndex + 1]
      };
    });
  }

  /**
   * Returns a snapshot of an AggregationData for that tags/labels values.
   * @param tags The desired data's tags
   */
  getSnapshot(tags: Tags): AggregationData {
    return this.rows[this.encodeTags(tags)];
  }
}
