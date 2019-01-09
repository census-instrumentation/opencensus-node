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

import {BucketOptions, DistributionBucket, DistributionValue, LabelKey, LabelValue, Metric, MetricDescriptor as OCMetricDescriptor, MetricDescriptorType, TimeSeriesPoint, Timestamp} from '@opencensus/core';
import * as os from 'os';
import * as path from 'path';
import {Distribution, LabelDescriptor, MetricDescriptor, MetricKind, Point, TimeSeries, ValueType} from './types';

/**
 * Util methods to convert OpenCensus Metrics data models to StackDriver
 * monitoring data models.
 */
export class StackdriverStatsExporterUtils {
  static readonly OPENCENSUS_TASK: string = 'opencensus_task';
  static readonly OPENCENSUS_TASK_DESCRIPTION: string =
      'Opencensus task identifier';
  static readonly OPENCENSUS_TASK_VALUE_DEFAULT =
      StackdriverStatsExporterUtils.generateDefaultTaskValue();

  /**
   * Returns a task label value in the format of 'nodejs-<pid>@<hostname>'.
   */
  static generateDefaultTaskValue(): string {
    const pid = process.pid;
    const hostname = os.hostname() || 'localhost';
    return 'nodejs-' + pid + '@' + hostname;
  }

  /**
   * Converts a OpenCensus MetricDescriptor to a StackDriver MetricDescriptor.
   * @param metricDescriptor The OpenCensus MetricDescriptor.
   */
  static createMetricDescriptorData(
      metricDescriptor: OCMetricDescriptor, metricPrefix: string,
      displayNamePrefix: string): MetricDescriptor {
    return {
      type: this.getMetricType(metricDescriptor.name, metricPrefix),
      description: metricDescriptor.description,
      displayName:
          this.createDisplayName(metricDescriptor.name, displayNamePrefix),
      metricKind: this.createMetricKind(metricDescriptor.type),
      valueType: this.createValueType(metricDescriptor.type),
      unit: metricDescriptor.unit,
      labels: this.createLabelDescriptor(metricDescriptor.labelKeys)
    } as MetricDescriptor;
  }

  /**
   * Converts metric's timeseries to a list of TimeSeries, so that metric can be
   * uploaded to StackDriver.
   * @param metric The metric to get TimeSeries information from.
   */
  static createTimeSeriesList(
      metric: Metric,
      monitoredResource: {type: string, labels: {[key: string]: string}},
      metricPrefix: string): TimeSeries[] {
    const timeSeriesList: TimeSeries[] = [];

    // TODO(mayurkale): Use Resource API here, once available (PR#173)
    const metricDescriptor = metric.descriptor;
    const metricKind = this.createMetricKind(metricDescriptor.type);
    const valueType = this.createValueType(metricDescriptor.type);

    for (const timeSeries of metric.timeseries) {
      timeSeriesList.push({
        metric: this.createMetric(
            metricDescriptor, timeSeries.labelValues, metricPrefix),
        resource: monitoredResource,
        metricKind,
        valueType,
        points: timeSeries.points.map(point => {
          return this.createPoint(point, timeSeries.startTimestamp, valueType);
        })
      });
    }
    return timeSeriesList;
  }

  /**
   * Gets metric type.
   * @param name The metric name.
   * @param metricPrefix The metric prefix.
   */
  static getMetricType(name: string, metricPrefix: string): string {
    return path.join(metricPrefix, name);
  }

  /**
   * Creates Metric display name.
   * @param name The metric name
   * @param displayNamePrefix The metric display name.
   */
  static createDisplayName(name: string, displayNamePrefix: string): string {
    return path.join(displayNamePrefix, name);
  }

  /**
   * Converts a OpenCensus Type to a StackDriver MetricKind.
   * @param metricDescriptorType The kind of metric.
   */
  static createMetricKind(metricDescriptorType: MetricDescriptorType):
      MetricKind {
    if (metricDescriptorType === MetricDescriptorType.GAUGE_INT64 ||
        metricDescriptorType === MetricDescriptorType.GAUGE_DOUBLE) {
      return MetricKind.GAUGE;
    } else if (
        metricDescriptorType === MetricDescriptorType.CUMULATIVE_INT64 ||
        metricDescriptorType === MetricDescriptorType.CUMULATIVE_DOUBLE ||
        metricDescriptorType === MetricDescriptorType.CUMULATIVE_DISTRIBUTION) {
      return MetricKind.CUMULATIVE;
    }
    return MetricKind.UNSPECIFIED;
  }

  /**
   * Converts a OpenCensus Type to a StackDriver ValueType.
   * @param metricDescriptorType The kind of metric.
   */
  static createValueType(metricDescriptorType: MetricDescriptorType):
      ValueType {
    if (metricDescriptorType === MetricDescriptorType.CUMULATIVE_DOUBLE ||
        metricDescriptorType === MetricDescriptorType.GAUGE_DOUBLE) {
      return ValueType.DOUBLE;
    } else if (
        metricDescriptorType === MetricDescriptorType.GAUGE_INT64 ||
        metricDescriptorType === MetricDescriptorType.CUMULATIVE_INT64) {
      return ValueType.INT64;
    } else if (
        metricDescriptorType === MetricDescriptorType.GAUGE_DISTRIBUTION ||
        metricDescriptorType === MetricDescriptorType.CUMULATIVE_DISTRIBUTION) {
      return ValueType.DISTRIBUTION;
    } else {
      return ValueType.VALUE_TYPE_UNSPECIFIED;
    }
  }

  /**
   * Constructs a LabelDescriptor from a LabelKey.
   * @param tag The Tags to get TimeSeries information from.
   */
  static createLabelDescriptor(labelKeys: LabelKey[]): LabelDescriptor[] {
    const labelDescriptorList = labelKeys.map(labelKey => {
      return {
        key: labelKey.key,
        valueType: 'STRING',  // Now we only support String type.
        description: labelKey.description
      } as LabelDescriptor;
    });

    // add default "opencensus_task" label.
    labelDescriptorList.push({
      key: StackdriverStatsExporterUtils.OPENCENSUS_TASK,
      valueType: 'STRING',
      description: StackdriverStatsExporterUtils.OPENCENSUS_TASK_DESCRIPTION
    });
    return labelDescriptorList;
  }

  /**
   * Creates a Metric using the LabelKeys and LabelValues.
   * @param metricDescriptor The OpenCensus MetricDescriptor.
   * @param labelValues The OpenCensus LabelValue.
   */
  static createMetric(
      metricDescriptor: OCMetricDescriptor, labelValues: LabelValue[],
      metricPrefix: string): {type: string; labels: {[key: string]: string};} {
    const type = this.getMetricType(metricDescriptor.name, metricPrefix);
    const labels: {[key: string]: string} = {};
    for (let i = 0; i < labelValues.length; i++) {
      const value = labelValues[i].value;
      if (value && metricDescriptor.labelKeys[i]) {
        labels[metricDescriptor.labelKeys[i].key] = value;
      } else {
        // TODO(mayurkale) : consider to throw an error when LabelValue and
        // LabelKey lengths are not same.
      }
    }
    labels[StackdriverStatsExporterUtils.OPENCENSUS_TASK] =
        StackdriverStatsExporterUtils.OPENCENSUS_TASK_VALUE_DEFAULT;
    return {type, labels};
  }

  /**
   * Converts timeseries's point, so that metric can be uploaded to StackDriver.
   * @param point The timestamped measurement.
   * @param startTimeStamp The start timestamp of timeseries.
   * @param valueType The ValueType of metric.
   */
  static createPoint(
      point: TimeSeriesPoint, startTimeStamp: Timestamp,
      valueType: ValueType): Point {
    let value;
    if (valueType === ValueType.INT64) {
      value = {int64Value: point.value as number};
    } else if (valueType === ValueType.DOUBLE) {
      value = {doubleValue: point.value as number};
    } else if (valueType === ValueType.DISTRIBUTION) {
      value = {
        distributionValue:
            this.createDistribution(point.value as DistributionValue)
      };
    } else {
      // console.log(`${valueType} is not supported.`);
    }

    const endTime = this.toISOString(point.timestamp);
    if (startTimeStamp) {
      // Must be present for cumulative metrics.
      const startTime = this.toISOString(startTimeStamp);
      return {interval: {startTime, endTime}, value};
    }

    return {interval: {endTime}, value};
  }

  /**
   * Formats an OpenCensus Distribution to Stackdriver's format.
   * @param distribution The OpenCensus Distribution Data.
   */
  static createDistribution(distribution: DistributionValue): Distribution {
    return {
      count: distribution.count,
      mean: distribution.count === 0 ? 0 :
                                       distribution.sum / distribution.count,
      sumOfSquaredDeviation: distribution.sumOfSquaredDeviation,
      bucketOptions: {
        explicitBuckets: {
          bounds: this.createExplicitBucketOptions(distribution.bucketOptions)
        }
      },
      bucketCounts: this.createBucketCounts(distribution.buckets)
    };
  }

  /**
   * Converts a OpenCensus BucketOptions to a StackDriver BucketOptions.
   * @param buckets The DistributionValue BucketOptions.
   */
  static createExplicitBucketOptions(bucketOptions: BucketOptions): number[] {
    const explicitBucketOptions: number[] = [];
    // The first bucket bound should be 0.0 because the Metrics first bucket is
    // [0, first_bound) but Stackdriver monitoring bucket bounds begin with
    // -infinity (first bucket is (-infinity, 0))
    explicitBucketOptions.push(0);
    return explicitBucketOptions.concat(bucketOptions.explicit.bounds);
  }

  /**
   * Converts a OpenCensus Buckets to a list of counts.
   * @param buckets The DistributionValue buckets.
   */
  static createBucketCounts(buckets: DistributionBucket[]): number[] {
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

  private static toISOString(timestamp: Timestamp) {
    const str = new Date(timestamp.seconds * 1000).toISOString();
    const nsStr = `${this.padNS(timestamp.nanos)}`.replace(/0+$/, '');
    return str.replace('000Z', `${nsStr}Z`);
  }

  private static padNS(ns: number) {
    const str = `${ns}`;
    const pad = '000000000'.substring(0, 9 - str.length);
    return `${pad}${str}`;
  }
}
