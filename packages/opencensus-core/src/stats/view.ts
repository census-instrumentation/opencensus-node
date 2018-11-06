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

import * as defaultLogger from '../common/console-logger';
import * as loggerTypes from '../common/types';

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
  /** An object to log information to */
  private logger: loggerTypes.Logger;

  /**
   * Creates a new View instance. This constructor is used by Stats. User should
   * prefer using Stats.createView() instead.
   * @param name The view name
   * @param measure The view measure
   * @param aggregation The view aggregation type
   * @param tagsKeys The Tags' keys that view will have
   * @param description The view description
   * @param bucketBoundaries The view bucket boundaries for a distribution
   * @param defaultLogger
   * aggregation type
   */
  constructor(
      name: string, measure: Measure, aggregation: AggregationType,
      tagsKeys: string[], description: string, bucketBoundaries?: number[],
      logger = defaultLogger) {
    if (aggregation === AggregationType.DISTRIBUTION && !bucketBoundaries) {
      throw new Error('No bucketBoundaries specified');
    }
    this.logger = logger.logger();
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

    if (measurement.value < 0) {
      this.logger.warn(
          'Dropping values, value to record must be non-negative.');
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
    let negative = 0;
    const result = bucketBoundaries.reduce((accumulator, boundary, index) => {
      if (boundary >= 0) {
        const nextBoundary = bucketBoundaries[index + 1];
        this.validateBoundary(boundary, nextBoundary);
        const len = bucketBoundaries.length - negative;
        const position = index - negative;
        const bucket = this.createBucket(boundary, nextBoundary, position, len);
        accumulator.push(bucket);
      } else {
        negative++;
      }
      return accumulator;
    }, []);
    if (negative) {
      this.logger.warn(`Dropping ${
          negative} negative bucket boundaries, the values must be strictly > 0.`);
    }
    return result;
  }

  /**
   * Checks boundaries order and duplicates
   * @param current Boundary
   * @param next Next boundary
   */
  private validateBoundary(current: number, next: number) {
    if (next) {
      if (current > next) {
        this.logger.error('Bucket boundaries not sorted.');
      }
      if (current === next) {
        this.logger.error('Bucket boundaries not unique.');
      }
    }
  }

  /**
   * Creates empty bucket boundary.
   * @param current Current boundary
   * @param next Next boundary
   * @param position Index of boundary
   * @param max Maximum length of boundaries
   */
  private createBucket(
      current: number, next: number, position: number, max: number): Bucket {
    return {
      count: 0,
      lowBoundary: position ? current : -Infinity,
      highBoundary: (position === max - 1) ? Infinity : next
    };
  }

  /**
   * Returns a snapshot of an AggregationData for that tags/labels values.
   * @param tags The desired data's tags
   */
  getSnapshot(tags: Tags): AggregationData {
    return this.rows[this.encodeTags(tags)];
  }
}
