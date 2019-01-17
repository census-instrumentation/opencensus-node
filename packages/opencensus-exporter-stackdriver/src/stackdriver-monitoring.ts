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

import {logger, Logger, Measurement, Metric, MetricDescriptor as OCMetricDescriptor, MetricProducerManager, Metrics, StatsEventListener, View} from '@opencensus/core';
import {auth, JWT} from 'google-auth-library';
import {google} from 'googleapis';

import {createMetricDescriptorData, createTimeSeriesList} from './stackdriver-stats-utils';
import {StackdriverExporterOptions, TimeSeries} from './types';

google.options({headers: {'x-opencensus-outgoing-request': 0x1}});
const monitoring = google.monitoring('v3');
const GOOGLEAPIS_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

/** Format and sends Stats to Stackdriver */
export class StackdriverStatsExporter implements StatsEventListener {
  private period: number;
  private projectId: string;
  private metricPrefix: string;
  private displayNamePrefix: string;
  private onMetricUploadError: (err: Error) => void;
  private timer: NodeJS.Timer;
  static readonly DEFAULT_DISPLAY_NAME_PREFIX: string = 'OpenCensus';
  static readonly CUSTOM_OPENCENSUS_DOMAIN: string =
      'custom.googleapis.com/opencensus';
  static readonly GLOBAL: string = 'global';
  static readonly PERIOD: number = 60000;
  private registeredMetricDescriptors: Map<string, OCMetricDescriptor> =
      new Map();

  logger: Logger;

  constructor(options: StackdriverExporterOptions) {
    this.period = options.period !== undefined ?
        options.period :
        StackdriverStatsExporter.PERIOD;
    this.projectId = options.projectId;
    this.metricPrefix =
        options.prefix || StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN;
    this.displayNamePrefix =
        options.prefix || StackdriverStatsExporter.DEFAULT_DISPLAY_NAME_PREFIX;
    this.logger = options.logger || logger.logger();
    this.onMetricUploadError = options.onMetricUploadError;
  }

  /**
   * Creates a Stackdriver Stats exporter with a StackdriverExporterOptions.
   */
  start(): void {
    this.timer = setInterval(async () => {
      try {
        await this.export();
      } catch (err) {
        if (typeof this.onMetricUploadError === 'function') {
          this.onMetricUploadError(err);
        }
      }
    }, this.period);
  }

  /**
   * Polls MetricProducerManager from Metrics library for all registered
   * MetricDescriptors, and upload them as TimeSeries to StackDriver.
   */
  async export() {
    const metricsList: Metric[] = [];
    const metricProducerManager: MetricProducerManager =
        Metrics.getMetricProducerManager();
    for (const metricProducer of metricProducerManager.getAllMetricProducer()) {
      for (const metric of metricProducer.getMetrics()) {
        // TODO(mayurkale): OPTIMIZATION: consider to call in parallel.
        const isRegistered =
            await this.registerMetricDescriptor(metric.descriptor);
        if (metric && isRegistered) {
          metricsList.push(metric);
        }
      }
    }

    this.createTimeSeries(metricsList);
  }

  /**
   * Returns true if the given metricDescriptor is successfully registered to
   * Stackdriver Monitoring, or the exact same metric has already been
   * registered. Returns false otherwise.
   * @param metricDescriptor The OpenCensus MetricDescriptor.
   */
  private async registerMetricDescriptor(metricDescriptor: OCMetricDescriptor) {
    const existingMetricDescriptor =
        this.registeredMetricDescriptors.get(metricDescriptor.name);

    if (existingMetricDescriptor) {
      if (existingMetricDescriptor === metricDescriptor) {
        // Ignore metricDescriptor that are already registered.
        return true;
      } else {
        this.logger.warn(
            `A different metric with the same name is already registered: ${
                existingMetricDescriptor}`);
        return false;
      }
    }
    const isRegistered = await this.createMetricDescriptor(metricDescriptor)
                             .then(() => {
                               this.registeredMetricDescriptors.set(
                                   metricDescriptor.name, metricDescriptor);
                               return true;
                             })
                             .catch((err) => {
                               this.logger.error(err);
                               return false;
                             });
    return isRegistered;
  }

  /**
   * Converts metric's timeseries to a list of TimeSeries, so that metric can
   * be uploaded to StackDriver.
   * @param metricsList The List of Metric.
   */
  private createTimeSeries(metricsList: Metric[]) {
    const timeSeries: TimeSeries[] = [];
    const resourceLabels = {project_id: this.projectId};
    const monitoredResource = {type: 'global', labels: resourceLabels};

    for (const metric of metricsList) {
      timeSeries.push(...createTimeSeriesList(
          metric, monitoredResource, this.metricPrefix));
    }

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

  /**
   * Creates a new metric descriptor.
   * @param metricDescriptor The OpenCensus MetricDescriptor.
   */
  private createMetricDescriptor(metricDescriptor: OCMetricDescriptor) {
    return this.authorize().then((authClient) => {
      const request = {
        name: `projects/${this.projectId}`,
        resource: createMetricDescriptorData(
            metricDescriptor, this.metricPrefix, this.displayNamePrefix),
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
   * Clear the interval timer to stop uploading metrics. It should be called
   * whenever the exporter is not needed anymore.
   */
  close() {
    clearInterval(this.timer);
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
            const scopes = [GOOGLEAPIS_SCOPE];
            authClient = authClient.createScoped(scopes);
          }
          return authClient;
        })
        .catch((err) => {
          err.message = `authorize error: ${err.message}`;
          throw (err);
        });
  }

  // TODO(mayurkale): Deprecate onRegisterView and onRecord apis after
  // https://github.com/census-instrumentation/opencensus-node/issues/257
  /**
   * Is called whenever a view is registered.
   * @param view The registered view.
   */
  onRegisterView(view: View) {}

  /**
   * Is called whenever a measure is recorded.
   * @param views The views associated with the measure
   * @param measurement The measurement recorded
   */
  onRecord(views: View[], measurement: Measurement) {}
}
