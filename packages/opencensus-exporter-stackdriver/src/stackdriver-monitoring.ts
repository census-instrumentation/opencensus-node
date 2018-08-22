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

import {AggregationType, Bucket, DistributionData, logger, Logger, Measurement, MeasureType, StatsEventListener, View} from '@opencensus/core';
import {auth, JWT} from 'google-auth-library';
import {google} from 'googleapis';

import {Distribution, LabelDescriptor, MetricDescriptor, MetricKind, Point, StackdriverExporterOptions, TimeSeries, ValueType} from './types';

google.options({headers: {'x-opencensus-outgoing-request': 0x1}});
const monitoring = google.monitoring('v3');

/** Format and sends Stats to Stackdriver */
export class StackdriverStatsExporter implements StatsEventListener {
  private projectId: string;
  logger: Logger;

  constructor(options: StackdriverExporterOptions) {
    this.projectId = options.projectId;
    this.logger = options.logger || logger.logger();
  }

  /**
   * Is called whenever a view is registered.
   * @param view The registered view.
   */
  onRegisterView(view: View) {
    return this.authorize().then((authClient) => {
      const request = {
        name: `projects/${this.projectId}`,
        resource: this.createMetricDescriptorData(view),
        auth: authClient
      };

      return new Promise((resolve, reject) => {
        monitoring.projects.metricDescriptors.create(request, (err: Error) => {
          this.logger.debug('sent metric descriptor', request.resource);
          err ? reject(err) : resolve();
        });
      });
    });
  }

  /**
   * Is called whenever a measure is recorded.
   * @param views The views associated with the measure
   * @param measurement The measurement recorded
   */
  onRecord(views: View[], measurement: Measurement) {
    const timeSeries = views.map(view => {
      return this.createTimeSeriesData(view, measurement);
    });

    return this.authorize().then(authClient => {
      const request = {
        name: `projects/${this.projectId}`,
        resource: {timeSeries},
        auth: authClient
      };

      return new Promise((resolve, reject) => {
        monitoring.projects.timeSeries.create(request, (err: Error) => {
          this.logger.debug('sent time series', request.resource.timeSeries);
          err ? reject(err) : resolve();
        });
      });
    });
  }

  /**
   * Gets the Google Application Credentials from the environment variables
   * and authenticates the client.
   */
  private authorize(): Promise<JWT> {
    return auth.getApplicationDefault()
        .then((client) => {
          let authClient = client.credential as JWT;

          if (authClient.createScopedRequired &&
              authClient.createScopedRequired()) {
            const scopes = ['https://www.googleapis.com/auth/cloud-platform'];
            authClient = authClient.createScoped(scopes);
          }

          return authClient;
        })
        .catch((err) => {
          err.message = `authorize error: ${err.message}`;
          throw (err);
        });
  }

  /**
   * Creates a Stackdriver TimeSeries from a given view and metric value.
   * @param view The view to get TimeSeries information from
   * @param measurement The measurement to get TimeSeries information from
   */
  private createTimeSeriesData(view: View, measurement: Measurement):
      TimeSeries {
    const aggregationData = view.getSnapshot(measurement.tags);

    const resourceLabels:
        {[key: string]: string} = {project_id: this.projectId};

    // For non Sum Aggregations, the end time should be the same as the start
    // time.
    const endTime = (new Date(aggregationData.timestamp)).toISOString();
    const startTime = view.aggregation === AggregationType.SUM ?
        (new Date(view.startTime)).toISOString() :
        endTime;

    let value;
    if (view.measure.type === MeasureType.INT64) {
      value = {int64Value: measurement.value.toString()};
    } else if (aggregationData.type === AggregationType.DISTRIBUTION) {
      value = {distributionValue: this.createDistribution(aggregationData)};
    } else {
      value = {doubleValue: measurement.value};
    }

    return {
      metric: {
        type: `custom.googleapis.com/${view.name}`,
        labels: measurement.tags
      },
      resource: {type: 'global', labels: resourceLabels},
      metricKind: this.createMetricKind(view.aggregation),
      valueType: this.createValueType(view),
      points: [{interval: {startTime, endTime}, value}]
    };
  }

  /**
   * Formats an OpenCensus Distribution to Stackdriver's format.
   * @param distribution The OpenCensus Distribution Data
   */
  private createDistribution(distribution: DistributionData): Distribution {
    return {
      count: distribution.count.toString(),
      mean: distribution.mean,
      sumOfSquaredDeviation: distribution.sumSquaredDeviations,
      range: {min: distribution.min, max: distribution.max},
      bucketOptions: {
        explicitBuckets:
            {bounds: this.getBucketBoundaries(distribution.buckets)}
      },
      bucketCounts: this.getBucketCounts(distribution.buckets)
    };
  }

  /**
   * Gets the bucket boundaries in an monotonicaly increasing order.
   * @param buckets The bucket list to get the boundaries from
   */
  private getBucketBoundaries(buckets: Bucket[]): number[] {
    return [...buckets.map(bucket => bucket.lowBoundary), Infinity];
  }

  /**
   * Gets the count value for each bucket
   * @param buckets The bucket list to get the count values from
   */
  private getBucketCounts(buckets: Bucket[]): number[] {
    return buckets.map(bucket => bucket.count);
  }

  /**
   * Creates a Stackdriver LabelDescriptor from given Tags.
   * @param tag The Tags to get TimeSeries information from.
   */
  private createLabelDescriptor(tags: string[]): LabelDescriptor[] {
    return tags.map(labelKey => {
      return {key: labelKey, valueType: 'STRING', description: ''} as
          LabelDescriptor;
    });
  }

  /**
   * Creates a Stackdriver MetricDescriptor from a given view.
   * @param view The view to get MetricDescriptor information from
   */
  private createMetricDescriptorData(view: View): MetricDescriptor {
    return {
      type: `custom.googleapis.com/${view.name}`,
      description: view.description || view.measure.description,
      displayName: view.measure.name,
      metricKind: this.createMetricKind(view.aggregation),
      valueType: this.createValueType(view),
      unit: view.measure.unit,
      labels: this.createLabelDescriptor(view.getColumns())
    } as MetricDescriptor;
  }

  /**
   * Creates a Stackdriver ValueType from a given view.
   * @param view The view to extract data from
   */
  private createValueType(view: View): ValueType {
    if (view.measure.type === MeasureType.INT64) {
      return ValueType.INT64;
    } else if (view.aggregation === AggregationType.DISTRIBUTION) {
      return ValueType.DISTRIBUTION;
    }
    return ValueType.DOUBLE;
  }

  /**
   * Creates a Stackdriver MetricKind from a given aggregation.
   * @param aggregationType The aggregation type to get MetricKind information
   * from.
   */
  private createMetricKind(aggregationType: AggregationType): MetricKind {
    if (aggregationType === AggregationType.SUM) {
      return MetricKind.CUMULATIVE;
    }
    return MetricKind.GAUGE;
  }
}
