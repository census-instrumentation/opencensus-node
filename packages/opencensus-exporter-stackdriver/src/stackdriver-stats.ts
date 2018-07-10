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

import {AggregationType, Distribution, logger, Measure, Measurement, MetricValuesTypes, SingleValue, StatsExporter, Tags, View} from '@opencensus/core';
import {auth, JWT} from 'google-auth-library';
import {google} from 'googleapis';

import {LabelDescriptor, MetricDescriptor, MetricKind, StackdriverExporterOptions, TimeSeries, ValueType} from './types';

const monitoring = google.monitoring('v3');

/** Format and sends Stats to Stackdriver */
export class StackdriverStatsExporter implements StatsExporter {
  private projectId: string;
  // tslint:disable-next-line:no-any
  private client: any;

  constructor(options: StackdriverExporterOptions) {
    this.projectId = options.projectId;
  }

  /**
   * Is called whenever a view is registered.
   * @param view The registered view.
   */
  onRegisterView(view: View): Promise<MetricDescriptor> {
    return new Promise((resolve, reject) => {
      this.authorize()
          .then((authClient) => {
            const request = {
              name: `projects/${this.projectId}`,
              resource: this.getMetricDescriptorData(view),
              auth: authClient
            };

            monitoring.projects.metricDescriptors.create(
                request, (err: Error) => {
                  if (err) {
                    reject(err);
                  }
                  resolve(request.resource);
                });
          })
          .catch((err: Error) => {
            throw (err);
          });
    });
  }

  /**
   * Is called whenever a measure is recorded.
   * @param view The view associated with the measure.
   */
  onRecord(view: View): Promise<TimeSeries[]> {
    const timeSeries: TimeSeries[] = [];
    for (let i = 0; i < view.getSnapshotValues().length; i++) {
      timeSeries.push(
          this.getTimeSeriesData(view, view.getSnapshotValues()[i]));
    }
    return new Promise((resolve, reject) => {
      this.authorize()
          .then(authClient => {
            const request = {
              name: `projects/${this.projectId}`,
              resource: {timeSeries},
              auth: authClient
            };

            monitoring.projects.timeSeries.create(request, (err: Error) => {
              if (err) {
                reject(err);
              }
              resolve(request.resource.timeSeries);
            });
          })
          .catch(err => {
            throw (err);
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
   * @param view The view to get TimeSeries information from.
   * @param metricValue The metric value to get TimeSeries information from.
   */
  private getTimeSeriesData(view: View, metricValue: SingleValue|Distribution):
      TimeSeries {
    const resourceLabels:
        {[key: string]: string} = {project_id: this.projectId};

    let timeSeriesStartTime: string = null;
    if (view.aggregation === AggregationType.sum) {
      timeSeriesStartTime = (new Date(view.startTime)).toISOString();
    }

    let pointValue: {};
    if (view.measure.type === 'INT64') {
      const measurementValue = metricValue as SingleValue;
      pointValue = {int64Value: measurementValue.value.toString()};
    } else if (view.aggregation === AggregationType.distribution) {
      const measurementValue = metricValue as Distribution;
      pointValue = {distributionValue: this.getDistribution(measurementValue)};
    } else {
      const measurementValue = metricValue as SingleValue;
      pointValue = {doubleValue: measurementValue.value};
    }

    return {
      metric: {
        type: `custom.googleapis.com/${view.name}`,
        labels: metricValue.tags
      },
      resource: {type: 'global', labels: resourceLabels},
      metricKind: this.getMetricKind(view.aggregation),
      valueType: this.getValueType(view),
      points: [{
        interval: {
          startTime: timeSeriesStartTime,
          endTime: (new Date()).toISOString()
        },
        value: pointValue
      }]
    } as TimeSeries;
  }

  /**
   * Formats an OpenCensus' Distribution to Stackdriver's format.
   * @param distribution The OpenCensus Distribution.
   */
  private getDistribution(distribution: Distribution) {
    return {
      count: distribution.count,
      mean: distribution.mean,
      sumOfSquaredDeviation: distribution.sumSquaredDeviations,
      range: {min: distribution.min, max: distribution.max},
      bucketOptions:
          {explicitBuckets: distribution.boundaries.bucketBoundaries},
      bucketCounts: distribution.buckets.map((bucket) => bucket.count)
    };
  }

  /**
   * Creates a Stackdriver LabelDescriptor from given Tags.
   * @param tag The Tags to get TimeSeries information from.
   */
  private getLabelDescriptor(tags: string[]): LabelDescriptor[] {
    return tags.map(labelKey => {
      return {key: labelKey, valueType: 'STRING', description: ''} as
          LabelDescriptor;
    });
  }

  /**
   * Creates a Stackdriver MetricDescriptor from a given view.
   * @param view The view to get MetricDescriptor information from.
   */
  private getMetricDescriptorData(view: View): MetricDescriptor {
    return {
      type: `custom.googleapis.com/${view.name}`,
      description: view.description || view.measure.description,
      displayName: view.measure.name,
      metricKind: this.getMetricKind(view.aggregation),
      valueType: this.getValueType(view),
      unit: view.measure.unit,
      labels: this.getLabelDescriptor(view.columns)
    } as MetricDescriptor;
  }

  /**
   * Creates a Stackdriver ValueType from a given aggregation and measure.
   * @param aggregation The aggregation to get ValueType information from.
   * @param measure The measure to get ValueType information from.
   */
  private getValueType(view: View): ValueType {
    if (view.measure.type === 'DOUBLE') {
      return ValueType.DOUBLE;
    } else if (view.aggregation === AggregationType.distribution) {
      return ValueType.DISTRIBUTION;
    }
    return ValueType.INT64;
  }

  /**
   * Creates a Stackdriver MetricKind from a given aggregation.
   * @param aggregationType The aggregation type to get MetricKind information
   * from.
   */
  private getMetricKind(aggregationType: AggregationType): MetricKind {
    if (aggregationType === AggregationType.sum) {
      return MetricKind.CUMULATIVE;
    }
    return MetricKind.GAUGE;
  }
}