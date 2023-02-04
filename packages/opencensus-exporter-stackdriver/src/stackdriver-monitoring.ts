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

import {
  logger,
  Logger,
  Measurement,
  Metric,
  MetricDescriptor as OCMetricDescriptor,
  MetricProducerManager,
  Metrics,
  StatsEventListener,
  TagKey,
  TagValue,
  version,
  View,
} from '@opencensus/core';
import { auth as globalAuth, GoogleAuth, JWT } from 'google-auth-library';
import { google, monitoring_v3 } from 'googleapis';
import { getDefaultResource } from './common-utils';
import {
  createMetricDescriptorData,
  createTimeSeriesList,
} from './stackdriver-monitoring-utils';
import {
  MonitoredResource,
  StackdriverExporterOptions,
  TimeSeries,
} from './types';

const OC_USER_AGENT = {
  product: 'opencensus-node',
  version,
};
const OC_HEADER = {
  'x-opencensus-outgoing-request': 0x1,
};

google.options({ headers: OC_HEADER });
let auth = globalAuth;

/** Format and sends Stats to Stackdriver */
export class StackdriverStatsExporter implements StatsEventListener {
  private period: number;
  private projectId: string;
  private metricPrefix: string;
  private displayNamePrefix: string;
  private onMetricUploadError?: (err: Error) => void;
  private timer!: NodeJS.Timer;
  static readonly DEFAULT_DISPLAY_NAME_PREFIX: string = 'OpenCensus';
  static readonly CUSTOM_OPENCENSUS_DOMAIN: string =
    'custom.googleapis.com/opencensus';
  static readonly PERIOD: number = 60000;
  private registeredMetricDescriptors: Map<
    string,
    OCMetricDescriptor
  > = new Map();
  private DEFAULT_RESOURCE: Promise<MonitoredResource>;
  logger: Logger;
  private monitoring: monitoring_v3.Monitoring;

  constructor(options: StackdriverExporterOptions) {
    this.period =
      options.period !== undefined
        ? options.period
        : StackdriverStatsExporter.PERIOD;
    this.projectId = options.projectId;
    this.metricPrefix =
      options.prefix || StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN;
    this.displayNamePrefix =
      options.prefix || StackdriverStatsExporter.DEFAULT_DISPLAY_NAME_PREFIX;
    this.logger = options.logger || logger.logger();
    if (options.onMetricUploadError) {
      this.onMetricUploadError = options.onMetricUploadError;
    }
    this.DEFAULT_RESOURCE = getDefaultResource(this.projectId);
    if (options.credentials) {
      auth = new GoogleAuth({
        credentials: options.credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    }
    this.monitoring = google.monitoring({
      version: 'v3',
      rootUrl:
        'https://' + (options.apiEndpoint || 'monitoring.googleapis.com'),
    });
  }

  /**
   * Creates a Stackdriver Stats exporter with a StackdriverExporterOptions.
   */
  start(): void {
    this.timer = setInterval(async () => {
      try {
        await this.export();
      } catch (err) {
        this.reportMetricUploadError(err);
      }
    }, this.period);
  }

  /**
   * Polls MetricProducerManager from Metrics library for all registered
   * MetricDescriptors, and upload them as TimeSeries to StackDriver.
   */
  async export() {
    const metricsList: Metric[] = [];
    const metricProducerManager: MetricProducerManager = Metrics.getMetricProducerManager();
    for (const metricProducer of metricProducerManager.getAllMetricProducer()) {
      for (const metric of metricProducer.getMetrics()) {
        // TODO(mayurkale): OPTIMIZATION: consider to call in parallel.
        const isRegistered = await this.registerMetricDescriptor(
          metric.descriptor
        );
        if (metric && isRegistered) {
          metricsList.push(metric);
        }
      }
    }

    this.createTimeSeries(metricsList).catch(err => {
      this.reportMetricUploadError(err);
    });
  }

  private reportMetricUploadError(err) {
    if (typeof this.onMetricUploadError === 'function') {
      this.onMetricUploadError(err);
    }
  }

  /**
   * Returns true if the given metricDescriptor is successfully registered to
   * Stackdriver Monitoring, or the exact same metric has already been
   * registered. Returns false otherwise.
   * @param metricDescriptor The OpenCensus MetricDescriptor.
   */
  private async registerMetricDescriptor(metricDescriptor: OCMetricDescriptor) {
    const existingMetricDescriptor = this.registeredMetricDescriptors.get(
      metricDescriptor.name
    );

    if (existingMetricDescriptor) {
      if (existingMetricDescriptor === metricDescriptor) {
        // Ignore metricDescriptor that are already registered.
        return true;
      } else {
        this.logger.warn(
          `A different metric with the same name is already registered: ${existingMetricDescriptor}`
        );
        return false;
      }
    }
    const isRegistered = await this.createMetricDescriptor(metricDescriptor)
      .then(() => {
        this.registeredMetricDescriptors.set(
          metricDescriptor.name,
          metricDescriptor
        );
        return true;
      })
      .catch(err => {
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
  private async createTimeSeries(metricsList: Metric[]) {
    const timeSeries: TimeSeries[] = [];
    const monitoredResource = await this.DEFAULT_RESOURCE;
    for (const metric of metricsList) {
      timeSeries.push(
        ...createTimeSeriesList(metric, monitoredResource, this.metricPrefix)
      );
    }

    if (timeSeries.length === 0) {
      return Promise.resolve();
    }

    return this.authorize().then(authClient => {
      const request = {
        name: `projects/${this.projectId}`,
        resource: { timeSeries },
        auth: authClient,
      };

      return new Promise((resolve, reject) => {
        this.monitoring.projects.timeSeries.create(
          request,
          { headers: OC_HEADER, userAgentDirectives: [OC_USER_AGENT] },
          (err: Error | null) => {
            this.logger.debug('sent time series', request.resource.timeSeries);
            err ? reject(err) : resolve();
          }
        );
      });
    });
  }

  /**
   * Creates a new metric descriptor.
   * @param metricDescriptor The OpenCensus MetricDescriptor.
   */
  private createMetricDescriptor(metricDescriptor: OCMetricDescriptor) {
    return this.authorize().then(authClient => {
      const request = {
        name: `projects/${this.projectId}`,
        resource: createMetricDescriptorData(
          metricDescriptor,
          this.metricPrefix,
          this.displayNamePrefix
        ),
        auth: authClient,
      };

      return new Promise((resolve, reject) => {
        this.monitoring.projects.metricDescriptors.create(
          request,
          { headers: OC_HEADER, userAgentDirectives: [OC_USER_AGENT] },
          (err: Error | null) => {
            this.logger.debug('sent metric descriptor', request.resource);
            err ? reject(err) : resolve();
          }
        );
      }).catch(err => {
        this.logger.error(
          `StackdriverStatsExporter: Failed to write data: ${err.message}`
        );
        this.stop();
      });
    });
  }

  /**
   * Clear the interval timer to stop uploading metrics. It should be called
   * whenever the exporter is not needed anymore.
   */
  stop() {
    clearInterval(this.timer);
  }

  /**
   * Gets the Google Application Credentials from the environment variables
   * and authenticates the client.
   */
  private async authorize(): Promise<JWT> {
    const client = await auth.getClient();
    return client as JWT;
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
   * @param views The views related to the measurement
   * @param measurement The recorded measurement
   * @param tags The tags to which the value is applied
   */
  onRecord(
    views: View[],
    measurement: Measurement,
    tags: Map<TagKey, TagValue>
  ) {}
}
