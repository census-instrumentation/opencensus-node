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

import {AggregationType, DistributionData, logger, Logger, Measure, Measurement, MeasureType, MeasureUnit, StatsEventListener, Tags, View} from '@opencensus/core';
import {auth, JWT} from 'google-auth-library';
import {google} from 'googleapis';
import * as path from 'path';

import {Distribution, LabelDescriptor, MetricDescriptor, MetricKind, Point, StackdriverExporterOptions, TimeSeries, ValueType} from './types';

google.options({headers: {'x-opencensus-outgoing-request': 0x1}});
const monitoring = google.monitoring('v3');

const RECORD_SEPARATOR = String.fromCharCode(30);
const UNIT_SEPARATOR = String.fromCharCode(31);

/** Format and sends Stats to Stackdriver */
export class StackdriverStatsExporter implements StatsEventListener {
  private period: number;
  private projectId: string;
  private metricPrefix: string;
  private viewToUpload:
      {[key: string]: {view: View; tags: {[key: string]: Tags;}}};
  private timer: NodeJS.Timer;
  static readonly CUSTOM_OPENCENSUS_DOMAIN: string =
      'custom.googleapis.com/opencensus';
  static readonly PERIOD: number = 60000;
  logger: Logger;

  constructor(options: StackdriverExporterOptions) {
    this.period = options.period !== undefined ?
        options.period :
        StackdriverStatsExporter.PERIOD;
    this.projectId = options.projectId;
    this.metricPrefix =
        options.prefix || StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN;
    this.logger = options.logger || logger.logger();
    this.viewToUpload = {};

    this.timer = setInterval(async () => {
      try {
        await this.uploadViews();
      } catch (err) {
        if (typeof options.onMetricUploadError === 'function') {
          options.onMetricUploadError(err);
        }
      }
    }, this.period);
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
    for (const view of views) {
      if (!this.viewToUpload[view.name]) {
        this.viewToUpload[view.name] = {view, tags: {}};
      }
      const tagsKey = this.encodeTags(measurement.tags);
      this.viewToUpload[view.name].tags[tagsKey] = measurement.tags;
    }
  }

  /**
   * Clear the interval timer to stop uploading metrics. It should be called
   * whenever the exporter is not needed anymore.
   */
  close() {
    clearInterval(this.timer);
  }

  private uploadViews() {
    const timeSeries: TimeSeries[] = [];
    for (const name of Object.keys(this.viewToUpload)) {
      const v = this.viewToUpload[name];
      for (const tagsKey of Object.keys(v.tags)) {
        timeSeries.push(this.createTimeSeriesData(v.view, v.tags[tagsKey]));
      }
    }
    this.viewToUpload = {};

    if (timeSeries.length === 0) {
      return Promise.resolve();
    }

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

  private encodeTags(tags: Tags): string {
    return Object.keys(tags)
        .sort()
        .map(tagKey => {
          return tagKey + UNIT_SEPARATOR + tags[tagKey];
        })
        .join(RECORD_SEPARATOR);
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
  private createTimeSeriesData(view: View, tags: Tags): TimeSeries {
    const aggregationData = view.getSnapshot(tags);

    const resourceLabels:
        {[key: string]: string} = {project_id: this.projectId};

    // For LAST_VALUE Aggregations, the end time should be the same as the start
    // time.
    const endTime = (new Date(aggregationData.timestamp)).toISOString();
    const startTime = view.aggregation !== AggregationType.LAST_VALUE ?
        (new Date(view.startTime)).toISOString() :
        endTime;

    let value;
    if (aggregationData.type === AggregationType.DISTRIBUTION) {
      value = {distributionValue: this.createDistribution(aggregationData)};
    } else if (view.measure.type === MeasureType.INT64) {
      value = {int64Value: aggregationData.value};
    } else {
      value = {doubleValue: aggregationData.value};
    }

    return {
      metric: {type: this.getMetricType(view.name), labels: tags},
      resource: {type: 'global', labels: resourceLabels},
      metricKind: this.createMetricKind(view.aggregation),
      valueType: this.createValueType(view.aggregation, view.measure),
      points: [{interval: {startTime, endTime}, value}]
    };
  }

  /**
   * Formats an OpenCensus Distribution to Stackdriver's format.
   * @param distribution The OpenCensus Distribution Data
   */
  private createDistribution(distribution: DistributionData): Distribution {
    return {
      count: distribution.count,
      mean: distribution.mean,
      sumOfSquaredDeviation: distribution.sumSquaredDeviations,
      bucketOptions: {explicitBuckets: {bounds: [0, ...distribution.buckets]}},
      bucketCounts: [0, ...distribution.bucketCounts]
    };
  }

  /**
   * Gets metric type
   * @param name The view name
   */
  private getMetricType(name: string): string {
    return path.join(this.metricPrefix, name);
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
      type: this.getMetricType(view.name),
      description: view.description || view.measure.description,
      displayName: view.measure.name,
      metricKind: this.createMetricKind(view.aggregation),
      valueType: this.createValueType(view.aggregation, view.measure),
      unit: this.createUnit(view.aggregation, view.measure),
      labels: this.createLabelDescriptor(view.getColumns())
    } as MetricDescriptor;
  }
  /**
   * Creates a Stackdriver unit from given aggregationType and measure.
   *
   * @param {AggregationType} aggregationType the aggregation type.
   * @param {Measure} measure the view measure.
   * @returns {string} unit.
   */
  private createUnit(aggregationType: AggregationType, measure: Measure):
      string {
    if (aggregationType === AggregationType.COUNT) {
      // If the aggregation type is count, which counts the number of recorded
      // measurements, the unit must be "1", because this view does not apply to
      // the recorded values.
      return MeasureUnit.UNIT;
    }
    return measure.unit;
  }

  /**
   * Creates a Stackdriver ValueType from a given aggregationType and measure.
   *
   * @param  {AggregationType} aggregationType the aggregation type.
   * @param  {Measure} measure the view measure.
   * @returns {ValueType} value type.
   */
  private createValueType(aggregationType: AggregationType, measure: Measure):
      ValueType {
    if (aggregationType === AggregationType.COUNT) {
      return ValueType.INT64;
    } else if (aggregationType === AggregationType.SUM) {
      switch (measure.type) {
        case MeasureType.INT64:  // Sum INT64
          return ValueType.INT64;
        case MeasureType.DOUBLE:  // Sum Double
          return ValueType.DOUBLE;
        default:
          throw new Error(`Unknown measure type: ${measure.type}`);
      }
    } else if (aggregationType === AggregationType.DISTRIBUTION) {
      return ValueType.DISTRIBUTION;
    } else if (aggregationType === AggregationType.LAST_VALUE) {
      switch (measure.type) {
        case MeasureType.INT64:  // LastValue INT64
          return ValueType.INT64;
        case MeasureType.DOUBLE:  // LastValue Double
          return ValueType.DOUBLE;
        default:
          throw new Error(`Unknown measure type ${measure.type}`);
      }
    }
    throw Error(`unsupported aggregation type: ${aggregationType}`);
  }

  /**
   * Creates a Stackdriver MetricKind from a given aggregation.
   * @param aggregationType The aggregation type to get MetricKind information
   * from.
   */
  private createMetricKind(aggregationType: AggregationType): MetricKind {
    if (aggregationType !== AggregationType.LAST_VALUE) {
      return MetricKind.CUMULATIVE;
    }
    return MetricKind.GAUGE;
  }
}
