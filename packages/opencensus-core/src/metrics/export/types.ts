/**
 * Copyright 2018, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 the "License";
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


/** Properties of a Metric. */
export interface Metric {
  /** Metric metricDescriptor */
  metricDescriptor: (MetricDescriptor|null);
  /** Metric name */
  readonly name: (string|null);
  /** Metric timeseries */
  readonly timeseries: (TimeSeries[]|null);
}

/** Properties of a MetricDescriptor. */
export interface MetricDescriptor {
  /** MetricDescriptor name */
  readonly name: (string|null);
  /** MetricDescriptor description */
  readonly description: (string|null);
  /** MetricDescriptor unit */
  readonly unit: (string|null);
  /** MetricDescriptor type */
  readonly type: (MetricDescriptorType|null);
  /** MetricDescriptor labelKeys */
  readonly labelKeys: (LabelKey[]|null);
}

export enum MetricDescriptorType {
  UNSPECIFIED,
  GAUGE_INT64,
  GAUGE_DOUBLE,
  GAUGE_DISTRIBUTION,
  CUMULATIVE_INT64,
  CUMULATIVE_DOUBLE,
  CUMULATIVE_DISTRIBUTION,
  SUMMARY
}

/** Properties of a LabelKey. */
export interface LabelKey {
  /** LabelKey key */
  readonly key: (string|null);
  /** LabelKey description */
  readonly description: (string|null);
}

/** Properties of a TimeSeries. */
export interface TimeSeries {
  /** TimeSeries startTimestamp */
  readonly startTimestamp: (Timestamp|null);
  /** TimeSeries labelValues */
  readonly labelValues: (LabelValue[]|null);
  /** TimeSeries points */
  readonly points: (Point[]|null);
}

/** Properties of a LabelValue. */
export interface LabelValue {
  /** LabelValue value */
  readonly value: (string|null);
  /** LabelValue hasValue */
  readonly hasValue: (boolean|null);
}

/** Properties of a Point. */
export interface Point {
  /** Point timestamp */
  readonly timestamp: (Timestamp|null);
  /** Point int64Value */
  readonly int64Value: (number|null);
  /** Point doubleValue */
  readonly doubleValue: (number|null);
  /** Point distributionValue */
  readonly distributionValue: (DistributionValue|null);
  /** Point summaryValue */
  readonly summaryValue: (SummaryValue|null);
}

/** Properties of a DistributionValue. */
export interface DistributionValue {
  /** DistributionValue count */
  readonly count: (number|null);
  /** DistributionValue sum */
  readonly sum: (number|null);
  /** DistributionValue sumOfSquaredDeviation */
  readonly sumOfSquaredDeviation: (number|null);
  /** DistributionValue bucketOptions */
  readonly bucketOptions: (BucketOptions|null);
  /** DistributionValue buckets */
  readonly buckets: (Bucket[]|null);
}

/** Properties of a BucketOptions. */
export interface BucketOptions {
  /** BucketOptions explicit */
  readonly explicit: (Explicit|null);
}

/** Properties of an Explicit. */
export interface Explicit {
  /** Explicit bounds */
  readonly bounds: (number[]|null);
}

/** Properties of a Bucket. */
export interface Bucket {
  /** Bucket count */
  readonly count: (number|null);
  /** Bucket exemplar */
  readonly exemplar: (Exemplar|null);
}

/** Properties of an Exemplar. */
export interface Exemplar {
  /** Exemplar value */
  readonly value: (number|null);
  /** Exemplar timestamp */
  readonly timestamp: (Timestamp|null);
  /** Exemplar attachments */
  readonly attachments: ({[k: string]: string}|null);
}

/** Properties of a SummaryValue. */
export interface SummaryValue {
  /** SummaryValue count */
  readonly count: (number|null);
  /** SummaryValue sum */
  readonly sum: (number|null);
  /** SummaryValue snapshot */
  readonly snapshot: (Snapshot|null);
}

/** Properties of a Snapshot. */
export interface Snapshot {
  /** Snapshot count */
  readonly count: (number|null);
  /** Snapshot sum */
  readonly sum: (number|null);
  /** Snapshot percentileValues */
  readonly percentileValues: (ValueAtPercentile[]|null);
}

/** Properties of a ValueAtPercentile. */
export interface ValueAtPercentile {
  /** ValueAtPercentile percentile */
  readonly percentile: (number|null);
  /** ValueAtPercentile value */
  readonly value: (number|null);
}

export interface Timestamp {
  /**
   * Represents seconds of UTC time since Unix epoch
   * 1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
   * 9999-12-31T23:59:59Z inclusive.
   */
  seconds: number|null;
  /**
   * Non-negative fractions of a second at nanosecond resolution. Negative
   * second values with fractions must still have non-negative nanos values
   * that count forward in time. Must be from 0 to 999,999,999
   * inclusive.
   */
  nanos: number|null;
}
