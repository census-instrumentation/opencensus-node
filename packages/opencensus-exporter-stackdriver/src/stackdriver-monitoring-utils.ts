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

import {
  BucketOptions,
  DistributionBucket,
  DistributionValue,
  Exemplar as OCExemplar,
  LabelKey,
  LabelValue,
  Metric,
  MetricDescriptor as OCMetricDescriptor,
  MetricDescriptorType,
  TimeSeriesPoint,
  Timestamp,
} from '@opencensus/core';
import * as os from 'os';
import * as path from 'path';
import {
  Any,
  Distribution,
  Exemplar,
  LabelDescriptor,
  MetricDescriptor,
  MetricKind,
  MonitoredResource,
  Point,
  TimeSeries,
  ValueType,
} from './types';

const OPENCENSUS_TASK = 'opencensus_task';
const OPENCENSUS_TASK_DESCRIPTION = 'Opencensus task identifier';
export const OPENCENSUS_TASK_VALUE_DEFAULT = generateDefaultTaskValue();

const EXEMPLAR_ATTACHMENT_TYPE_STRING =
  'type.googleapis.com/google.protobuf.StringValue';
// TODO: add support for SpanContext attachment.
// const EXEMPLAR_ATTACHMENT_TYPE_SPAN_CONTEXT =
//     'type.googleapis.com/google.monitoring.v3.SpanContext';
const ATTACHMENT_KEY_SPAN_CONTEXT = 'SpanContext';

// TODO: add support for dropped label attachment.
// const EXEMPLAR_ATTACHMENT_TYPE_DROPPED_LABELS =
// 'type.googleapis.com/google.monitoring.v3.DroppedLabels';

/** Converts a OpenCensus MetricDescriptor to a StackDriver MetricDescriptor. */
export function createMetricDescriptorData(
  metricDescriptor: OCMetricDescriptor,
  metricPrefix: string,
  displayNamePrefix: string
): MetricDescriptor {
  return {
    type: createMetricType(metricDescriptor.name, metricPrefix),
    description: metricDescriptor.description,
    displayName: createDisplayName(metricDescriptor.name, displayNamePrefix),
    metricKind: createMetricKind(metricDescriptor.type),
    valueType: createValueType(metricDescriptor.type),
    unit: metricDescriptor.unit,
    labels: createLabelDescriptor(metricDescriptor.labelKeys),
  };
}

/**
 * Converts metric's timeseries to a list of TimeSeries, so that metric can be
 * uploaded to StackDriver.
 */
export function createTimeSeriesList(
  metric: Metric,
  monitoredResource: MonitoredResource,
  metricPrefix: string
): TimeSeries[] {
  const timeSeriesList: TimeSeries[] = [];

  // TODO(mayurkale): Use Resource API here, once available (PR#173)
  const metricDescriptor = metric.descriptor;
  const metricKind = createMetricKind(metricDescriptor.type);
  const valueType = createValueType(metricDescriptor.type);

  for (const timeSeries of metric.timeseries) {
    timeSeriesList.push({
      metric: createMetric(
        metricDescriptor,
        timeSeries.labelValues,
        metricPrefix
      ),
      resource: monitoredResource,
      metricKind,
      valueType,
      points: timeSeries.points.map(point => {
        return createPoint(point, valueType, timeSeries.startTimestamp);
      }),
    });
  }
  return timeSeriesList;
}

/** Creates Metric type. */
function createMetricType(name: string, metricPrefix: string): string {
  return path.join(metricPrefix, name);
}

/** Creates Metric display name. */
function createDisplayName(name: string, displayNamePrefix: string): string {
  return path.join(displayNamePrefix, name);
}

/** Converts a OpenCensus Type to a StackDriver MetricKind. */
function createMetricKind(
  metricDescriptorType: MetricDescriptorType
): MetricKind {
  if (
    metricDescriptorType === MetricDescriptorType.GAUGE_INT64 ||
    metricDescriptorType === MetricDescriptorType.GAUGE_DOUBLE
  ) {
    return MetricKind.GAUGE;
  } else if (
    metricDescriptorType === MetricDescriptorType.CUMULATIVE_INT64 ||
    metricDescriptorType === MetricDescriptorType.CUMULATIVE_DOUBLE ||
    metricDescriptorType === MetricDescriptorType.CUMULATIVE_DISTRIBUTION
  ) {
    return MetricKind.CUMULATIVE;
  }
  return MetricKind.UNSPECIFIED;
}

/** Converts a OpenCensus Type to a StackDriver ValueType. */
function createValueType(
  metricDescriptorType: MetricDescriptorType
): ValueType {
  if (
    metricDescriptorType === MetricDescriptorType.CUMULATIVE_DOUBLE ||
    metricDescriptorType === MetricDescriptorType.GAUGE_DOUBLE
  ) {
    return ValueType.DOUBLE;
  } else if (
    metricDescriptorType === MetricDescriptorType.GAUGE_INT64 ||
    metricDescriptorType === MetricDescriptorType.CUMULATIVE_INT64
  ) {
    return ValueType.INT64;
  } else if (
    metricDescriptorType === MetricDescriptorType.GAUGE_DISTRIBUTION ||
    metricDescriptorType === MetricDescriptorType.CUMULATIVE_DISTRIBUTION
  ) {
    return ValueType.DISTRIBUTION;
  } else {
    return ValueType.VALUE_TYPE_UNSPECIFIED;
  }
}

/** Constructs a LabelDescriptor from a LabelKey. */
function createLabelDescriptor(labelKeys: LabelKey[]): LabelDescriptor[] {
  const labelDescriptorList: LabelDescriptor[] = labelKeys.map(labelKey => ({
    key: labelKey.key,
    valueType: 'STRING', // Now we only support String type.
    description: labelKey.description,
  }));

  // add default "opencensus_task" label.
  labelDescriptorList.push({
    key: OPENCENSUS_TASK,
    valueType: 'STRING',
    description: OPENCENSUS_TASK_DESCRIPTION,
  });
  return labelDescriptorList;
}

/** Creates a Metric using the LabelKeys and LabelValues. */
function createMetric(
  metricDescriptor: OCMetricDescriptor,
  labelValues: LabelValue[],
  metricPrefix: string
): { type: string; labels: { [key: string]: string } } {
  const type = createMetricType(metricDescriptor.name, metricPrefix);
  const labels: { [key: string]: string } = {};
  for (let i = 0; i < labelValues.length; i++) {
    const value = labelValues[i].value;
    if (
      value !== null &&
      value !== undefined &&
      metricDescriptor.labelKeys[i]
    ) {
      labels[metricDescriptor.labelKeys[i].key] = value;
    } else {
      // TODO(mayurkale) : consider to throw an error when LabelValue and
      // LabelKey lengths are not same.
    }
  }
  labels[OPENCENSUS_TASK] = OPENCENSUS_TASK_VALUE_DEFAULT;
  return { type, labels };
}

/**
 * Converts timeseries's point, so that metric can be uploaded to StackDriver.
 */
function createPoint(
  point: TimeSeriesPoint,
  valueType: ValueType,
  startTimeStamp?: Timestamp
): Point {
  const value = createValue(valueType, point);
  const endTime = toISOString(point.timestamp);
  if (startTimeStamp) {
    // Must be present for cumulative metrics.
    const startTime = toISOString(startTimeStamp);
    return { interval: { startTime, endTime }, value };
  }
  return { interval: { endTime }, value };
}

/** Converts a OpenCensus Point's value to a StackDriver Point value. */
function createValue(valueType: ValueType, point: TimeSeriesPoint) {
  if (valueType === ValueType.INT64) {
    return { int64Value: point.value as number };
  } else if (valueType === ValueType.DOUBLE) {
    return { doubleValue: point.value as number };
  } else if (valueType === ValueType.DISTRIBUTION) {
    return {
      distributionValue: createDistribution(point.value as DistributionValue),
    };
  }
  throw Error(`unsupported value type: ${valueType}`);
}

/** Formats an OpenCensus Distribution to Stackdriver's format. */
function createDistribution(distribution: DistributionValue): Distribution {
  return {
    count: distribution.count,
    mean: distribution.count === 0 ? 0 : distribution.sum / distribution.count,
    sumOfSquaredDeviation: distribution.sumOfSquaredDeviation,
    bucketOptions: {
      explicitBuckets: {
        bounds: createExplicitBucketOptions(distribution.bucketOptions),
      },
    },
    bucketCounts: createBucketCounts(distribution.buckets),
    exemplars: createExemplars(distribution.buckets),
  };
}

/** Converts a OpenCensus BucketOptions to a StackDriver BucketOptions. */
function createExplicitBucketOptions(bucketOptions: BucketOptions): number[] {
  const explicitBucketOptions: number[] = [];
  // The first bucket bound should be 0.0 because the Metrics first bucket is
  // [0, first_bound) but Stackdriver monitoring bucket bounds begin with
  // -infinity (first bucket is (-infinity, 0))
  explicitBucketOptions.push(0);
  return explicitBucketOptions.concat(bucketOptions.explicit.bounds);
}

/** Converts a OpenCensus Buckets to a list of counts. */
function createBucketCounts(buckets: DistributionBucket[]): number[] {
  const bucketCounts: number[] = [];
  // The first bucket (underflow bucket) should always be 0 count because the
  // Metrics first bucket is [0, first_bound) but StackDriver distribution
  // consists of an underflow bucket (number 0).
  bucketCounts.push(0);
  buckets.map((bucket: DistributionBucket) => {
    bucketCounts.push(bucket.count);
  });
  return bucketCounts;
}

/** Converts a OpenCensus Buckets to a list of proto Exemplars. */
function createExemplars(buckets: DistributionBucket[]): Exemplar[] {
  return buckets
    .filter(bucket => !!bucket.exemplar)
    .map(bucket => ({
      value: bucket.exemplar!.value,
      timestamp: toISOString(bucket.exemplar!.timestamp),
      attachments: _createAttachments(bucket.exemplar!),
    }))
    .filter(exemplar => exemplar.attachments.length > 0);
}

function _createAttachments(exemplar: OCExemplar): Any[] {
  return Object.keys(exemplar.attachments)
    .map(key => {
      if (key === ATTACHMENT_KEY_SPAN_CONTEXT) {
        // TODO: add support for SpanContext
        // attachment.
        return null;
      } else {
        // Everything else will be treated as plain
        // strings for now.
        return {
          '@type': EXEMPLAR_ATTACHMENT_TYPE_STRING,
          value: exemplar.attachments[key],
        };
      }
    })
    .filter(attachment => !!attachment) as Any[];
}

/** Returns a task label value in the format of 'nodejs-<pid>@<hostname>'. */
function generateDefaultTaskValue(): string {
  const pid = process.pid;
  const hostname = os.hostname() || 'localhost';
  return 'nodejs-' + pid + '@' + hostname;
}

function toISOString(timestamp: Timestamp) {
  const str = new Date(timestamp.seconds! * 1000).toISOString();
  const nsStr = `${leftZeroPad(timestamp.nanos!)}`.replace(/0+$/, '');
  return str.replace('000Z', `${nsStr}Z`);
}

/** Pad a number with 0 on the left */
function leftZeroPad(ns: number) {
  const str = `${ns}`;
  const pad = '000000000'.substring(0, 9 - str.length);
  return `${pad}${str}`;
}

export const TEST_ONLY = {
  createMetricType,
  createDisplayName,
  createPoint,
  createMetric,
  createLabelDescriptor,
  createValueType,
  createMetricKind,
  createDistribution,
  createExplicitBucketOptions,
  createValue,
  createBucketCounts,
};
