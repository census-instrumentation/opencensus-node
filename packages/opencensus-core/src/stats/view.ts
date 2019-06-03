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
import {
  getTimestampWithProcessHRTime,
  timestampFromMillis,
} from '../common/time-util';
import * as loggerTypes from '../common/types';
import {
  Bucket as metricBucket,
  DistributionValue,
  LabelValue,
  Metric,
  MetricDescriptor,
  MetricDescriptorType,
  Point,
  TimeSeries,
  Timestamp,
} from '../metrics/export/types';
import { TagMap } from '../tags/tag-map';
import { TagKey, TagValue } from '../tags/types';
import { isValidTagKey } from '../tags/validation';
import { BucketBoundaries } from './bucket-boundaries';
import { MetricUtils } from './metric-utils';
import { Recorder } from './recorder';
import {
  AggregationData,
  AggregationType,
  Measure,
  Measurement,
  StatsExemplar,
  View,
} from './types';

const RECORD_SEPARATOR = String.fromCharCode(30);

/**
 * A View specifies an aggregation and a set of tag keys. The aggregation will
 * be broken down by the unique set of matching tag values for each measure.
 */
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
  private tagValueAggregationMap: { [key: string]: AggregationData } = {};
  /**
   * A list of tag keys that represents the possible column labels
   */
  private columns: TagKey[];
  /**
   * An Aggregation describes how data collected is aggregated.
   * There are four aggregation types: count, sum, lastValue and distirbution.
   */
  readonly aggregation: AggregationType;
  /** The start time for this view */
  readonly startTime: number;
  /** The bucket boundaries in a Distribution Aggregation */
  private bucketBoundaries?: BucketBoundaries;
  /**
   * Cache a MetricDescriptor to avoid converting View to MetricDescriptor
   * in the future.
   */
  private metricDescriptor: MetricDescriptor;
  /**
   * The end time for this view - represents the last time a value was recorded
   */
  endTime?: number;
  /** true if the view was registered */
  registered = false;
  /** An object to log information to */
  logger: loggerTypes.Logger;

  /**
   * Creates a new View instance. This constructor is used by Stats. User should
   * prefer using Stats.createView() instead.
   * @param name The view name
   * @param measure The view measure
   * @param aggregation The view aggregation type
   * @param tagsKeys The Tags' keys that view will have
   * @param description The view description
   * @param bucketBoundaries The view bucket boundaries for a distribution
   *     aggregation type
   * @param logger
   */
  constructor(
    name: string,
    measure: Measure,
    aggregation: AggregationType,
    tagsKeys: TagKey[],
    description: string,
    bucketBoundaries?: number[],
    logger = defaultLogger
  ) {
    if (aggregation === AggregationType.DISTRIBUTION && !bucketBoundaries) {
      throw new Error('No bucketBoundaries specified');
    }
    this.logger = logger.logger();
    this.name = name;
    this.description = description;
    this.measure = measure;
    this.columns = this.validateTagKeys(tagsKeys);
    this.aggregation = aggregation;
    this.startTime = Date.now();
    if (bucketBoundaries) {
      this.bucketBoundaries = new BucketBoundaries(bucketBoundaries);
    }
    this.metricDescriptor = MetricUtils.viewToMetricDescriptor(this);
  }

  /** Gets the view's tag keys */
  getColumns(): TagKey[] {
    return this.columns;
  }

  /**
   * Records a measurement in the proper view's row. This method is used by
   * Stats. User should prefer using Stats.record() instead.
   *
   * Measurements with measurement type INT64 will have its value truncated.
   * @param measurement The measurement to record
   * @param tags The tags to which the value is applied
   * @param attachments optional The contextual information associated with an
   *     example value. The contextual information is represented as key - value
   *     string pairs.
   */
  recordMeasurement(
    measurement: Measurement,
    tags: TagMap,
    attachments?: { [key: string]: string }
  ) {
    const tagValues = Recorder.getTagValues(tags.tags, this.columns);
    const encodedTags = this.encodeTagValues(tagValues);
    if (!this.tagValueAggregationMap[encodedTags]) {
      this.tagValueAggregationMap[encodedTags] = this.createAggregationData(
        tagValues
      );
    }

    Recorder.addMeasurement(
      this.tagValueAggregationMap[encodedTags],
      measurement,
      attachments
    );
  }

  /**
   * Encodes a TagValue object into a value sorted string.
   * @param tagValues The tagValues to encode
   */
  private encodeTagValues(tagValues: Array<TagValue | null>): string {
    return tagValues
      .map(tagValue => (tagValue ? tagValue.value : null))
      .sort()
      .join(RECORD_SEPARATOR);
  }

  /**
   * Creates an empty aggregation data for a given tags.
   * @param tagValues The tags for that aggregation data
   */
  private createAggregationData(
    tagValues: Array<TagValue | null>
  ): AggregationData {
    const aggregationMetadata = { tagValues, timestamp: Date.now() };

    switch (this.aggregation) {
      case AggregationType.DISTRIBUTION:
        const { buckets, bucketCounts } = this.bucketBoundaries!;
        const bucketsCopy = Object.assign([], buckets);
        const bucketCountsCopy = Object.assign([], bucketCounts);
        const exemplars = new Array(bucketCounts.length);

        return {
          ...aggregationMetadata,
          type: AggregationType.DISTRIBUTION,
          startTime: this.startTime,
          count: 0,
          sum: 0,
          mean: 0,
          stdDeviation: 0,
          sumOfSquaredDeviation: 0,
          buckets: bucketsCopy,
          bucketCounts: bucketCountsCopy,
          exemplars,
        };
      case AggregationType.SUM:
        return { ...aggregationMetadata, type: AggregationType.SUM, value: 0 };
      case AggregationType.COUNT:
        return {
          ...aggregationMetadata,
          type: AggregationType.COUNT,
          value: 0,
        };
      default:
        return {
          ...aggregationMetadata,
          type: AggregationType.LAST_VALUE,
          value: 0,
        };
    }
  }

  /**
   * Gets view`s metric
   * @param start The start timestamp in epoch milliseconds
   * @returns The Metric.
   */
  getMetric(start: number): Metric {
    const { type } = this.metricDescriptor;
    let startTimestamp: Timestamp;

    // The moment when this point was recorded.
    const now: Timestamp = getTimestampWithProcessHRTime();
    if (
      type !== MetricDescriptorType.GAUGE_INT64 &&
      type !== MetricDescriptorType.GAUGE_DOUBLE
    ) {
      startTimestamp = timestampFromMillis(start);
    }

    const timeseries: TimeSeries[] = [];
    Object.keys(this.tagValueAggregationMap).forEach(key => {
      const { tagValues } = this.tagValueAggregationMap[key];
      const labelValues: LabelValue[] = MetricUtils.tagValuesToLabelValues(
        tagValues
      );
      const point: Point = this.toPoint(now, this.getSnapshot(tagValues));

      if (startTimestamp) {
        timeseries.push({ startTimestamp, labelValues, points: [point] });
      } else {
        timeseries.push({ labelValues, points: [point] });
      }
    });

    return { descriptor: this.metricDescriptor, timeseries };
  }

  /**
   * Converts snapshot to point
   * @param timestamp The timestamp
   * @param data The aggregated data
   * @returns The Point.
   */
  private toPoint(timestamp: Timestamp, data: AggregationData): Point {
    if (data.type === AggregationType.DISTRIBUTION) {
      const { count, sum, sumOfSquaredDeviation, exemplars } = data;
      const buckets = [];
      if (data.bucketCounts) {
        for (let bucket = 0; bucket < data.bucketCounts.length; bucket++) {
          const bucketCount = data.bucketCounts[bucket];
          const statsExemplar = exemplars ? exemplars[bucket] : undefined;
          buckets.push(this.getMetricBucket(bucketCount, statsExemplar));
        }
      }
      const value: DistributionValue = {
        count,
        sum,
        sumOfSquaredDeviation,
        buckets,
        bucketOptions: { explicit: { bounds: data.buckets } },
      };
      return { timestamp, value };
    } else {
      const value: number = data.value;
      return { timestamp, value };
    }
  }

  /**
   * Returns a snapshot of an AggregationData for that tags/labels values.
   * @param tags The desired data's tags
   * @returns The AggregationData.
   */
  getSnapshot(tagValues: Array<TagValue | null>): AggregationData {
    return this.tagValueAggregationMap[this.encodeTagValues(tagValues)];
  }

  /** Returns a Bucket with count and examplar (if present) */
  private getMetricBucket(
    bucketCount: number,
    statsExemplar?: StatsExemplar
  ): metricBucket {
    if (statsExemplar) {
      // Bucket with an Exemplar.
      return {
        count: bucketCount,
        exemplar: {
          value: statsExemplar.value,
          timestamp: timestampFromMillis(statsExemplar.timestamp),
          attachments: statsExemplar.attachments,
        },
      };
    }
    // Bucket with no Exemplar.
    return { count: bucketCount };
  }

  /** Determines whether the given TagKeys are valid. */
  private validateTagKeys(tagKeys: TagKey[]): TagKey[] {
    const tagKeysCopy = Object.assign([], tagKeys);
    tagKeysCopy.forEach(tagKey => {
      if (!isValidTagKey(tagKey)) {
        throw new Error(`Invalid TagKey name: ${tagKey}`);
      }
    });
    const tagKeysSet = new Set(
      tagKeysCopy.map((tagKey: TagKey) => tagKey.name)
    );
    if (tagKeysSet.size !== tagKeysCopy.length) {
      throw new Error('Columns have duplicate');
    }
    return tagKeysCopy;
  }
}
