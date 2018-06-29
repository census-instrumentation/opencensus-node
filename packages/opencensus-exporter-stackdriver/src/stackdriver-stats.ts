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

import {Aggregation, AggregationCount, AggregationDistribution, AggregationLastValue, AggregationSum, logger, Measure, MeasureDouble, MeasureInt64, Measurement, StatsExporter, Tags, View} from '@opencensus/core';
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
   * @param measure The measure associated with the view.
   */
  onRegisterView(view: View, measure: Measure): Promise<MetricDescriptor> {
    return new Promise((resolve, reject) => {
      this.authorize()
          .then((authClient) => {
            const request = {
              name: `projects/${this.projectId}`,
              resource: this.getMetricDescriptorData(view, measure),
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
          .catch((err) => {
            throw (err);
          });
    });
  }

  /**
   * Is called whenever a measure is recorded.
   * @param view The view associated with the measure.
   * @param measure The recorded measure.
   */
  onRecord(view: View, measurement: Measurement): Promise<TimeSeries> {
    return new Promise((resolve, reject) => {
      this.authorize()
          .then((authClient) => {
            const request = {
              name: `projects/${this.projectId}`,
              resource: {
                timeSeries: [
                  this.getTimeSeriesData(view, measurement),
                ]
              },
              auth: authClient
            };

            monitoring.projects.timeSeries.create(request, (err: Error) => {
              if (err) {
                reject(err);
              }
              resolve(request.resource.timeSeries[0]);
            });
          })
          .catch((err) => {
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
   * Creates a Stackdriver TimeSeries from a given view and measurement.
   * @param view The view to get TimeSeries information from.
   * @param measurement The measurement to get TimeSeries information from.
   */
  private getTimeSeriesData(view: View, measurement: Measurement): TimeSeries {
    const resourceLabels:
        {[key: string]: string} = {project_id: this.projectId};

    let timeSeriesStartTime: string = null;
    if (view.aggregation instanceof AggregationSum) {
      timeSeriesStartTime = view.startTime.toISOString();
    }

    let pointValue: {};
    if (measurement.measure instanceof MeasureInt64) {
      pointValue = {int64Value: measurement.value.toString()};
    } else if (measurement.measure instanceof MeasureDouble) {
      pointValue = {doubleValue: measurement.value};
    }

    return {
      metric:
          {type: `custom.googleapis.com/${view.name}`, labels: view.columns},
      resource: {type: 'global', labels: resourceLabels},
      metricKind: this.getMetricKind(view.aggregation),
      valueType: this.getValueType(view.aggregation, measurement.measure),
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
   * Creates a Stackdriver LabelDescriptor from given Tags.
   * @param tag The Tags to get TimeSeries information from.
   */
  private getLabelDescriptor(tag: Tags): LabelDescriptor[] {
    return Object.keys(tag).map(labelKey => {
      return {key: labelKey, valueType: 'STRING', description: tag[labelKey]} as
          LabelDescriptor;
    });
  }

  /**
   * Creates a Stackdriver MetricDescriptor from a given view and measure.
   * @param view The view to get MetricDescriptor information from.
   * @param measure The measurement to get MetricDescriptor information from.
   */
  private getMetricDescriptorData(view: View, measure: Measure):
      MetricDescriptor {
    return {
      type: `custom.googleapis.com/${view.name}`,
      description: view.description || measure.description,
      displayName: measure.name,
      metricKind: this.getMetricKind(view.aggregation),
      valueType: this.getValueType(view.aggregation, measure),
      unit: measure.unit,
      labels: this.getLabelDescriptor(view.columns)
    } as MetricDescriptor;
  }

  /**
   * Creates a Stackdriver ValueType from a given aggregation and measure.
   * @param aggregation The aggregation to get ValueType information from.
   * @param measure The measure to get ValueType information from.
   */
  private getValueType(aggregation: Aggregation, measure: Measure): ValueType {
    if (measure instanceof MeasureDouble) {
      return ValueType.DOUBLE;
    } else if (aggregation instanceof AggregationDistribution) {
      return ValueType.DISTRIBUTION;
    }
    return ValueType.INT64;
  }

  /**
   * Creates a Stackdriver MetricKind from a given aggregation.
   * @param aggregation The aggregation to get MetricKind information from.
   */
  private getMetricKind(aggregation: Aggregation): MetricKind {
    if (aggregation instanceof AggregationSum) {
      return MetricKind.CUMULATIVE;
    }
    return MetricKind.GAUGE;
  }
}