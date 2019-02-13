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

import {AggregationType, DistributionData, ExporterConfig, logger, Logger, Measurement, StatsEventListener, TagKey, TagValue, View} from '@opencensus/core';
import * as express from 'express';
import * as http from 'http';
import {Counter, Gauge, Histogram, labelValues, Metric, Registry} from 'prom-client';

export interface PrometheusExporterOptions extends ExporterConfig {
  /** App prefix for metrics, if needed - default opencensus */
  prefix?: string;
  /**
   * Port number for Prometheus exporter server
   * Default registered port is 9464:
   * https://github.com/prometheus/prometheus/wiki/Default-port-allocations
   */
  port?: number;
  /**
   * Define if the Prometheus exporter server will be started - default false
   */
  startServer?: boolean;
}

/** Format and sends Stats to Prometheus exporter */
export class PrometheusStatsExporter implements StatsEventListener {
  static readonly DEFAULT_OPTIONS = {
    port: 9464,
    startServer: false,
    contentType: 'text/plain; text/plain; version=0.0.4; charset=utf-8',
    prefix: ''
  };

  private logger: Logger;
  private prefix: string;
  private port: number;
  private app = express();
  private server: http.Server;
  // Registry instance from Prometheus to keep the metrics
  private registry = new Registry();

  // Histogram cannot have a label named 'le'
  private static readonly RESERVED_HISTOGRAM_LABEL = 'le';

  constructor(options: PrometheusExporterOptions) {
    this.logger = options.logger || logger.logger();
    this.port = options.port || PrometheusStatsExporter.DEFAULT_OPTIONS.port;
    this.prefix =
        options.prefix || PrometheusStatsExporter.DEFAULT_OPTIONS.prefix;

    /** Start the server if the startServer option is true */
    if (options.startServer) {
      this.startServer();
    }
  }

  /**
   * Not used because registering metrics requires information that is
   * present in Measurement objects
   * @param view
   */
  onRegisterView(view: View) {}

  /**
   * Method called every new stats' record
   * @param views The views related to the measurement
   * @param measurement The recorded measurement
   * @param tags The tags to which the value is applied
   */
  onRecord(
      views: View[], measurement: Measurement, tags: Map<TagKey, TagValue>) {
    for (const view of views) {
      this.updateMetric(view, measurement, tags);
    }
  }

  /**
   * Starts the Prometheus exporter that polls Metric from Metrics library and
   * send batched data to backend.
   */
  start(): void {
    // TODO(mayurkale): add setInterval here to poll Metric, transform and send
    // // it to backend (dependency with PR#253).
  }

  private getLabelValues(columns: TagKey[], tags: Map<TagKey, TagValue>):
      labelValues {
    const labels: labelValues = {};
    columns.forEach((tagKey) => {
      if (tags.has(tagKey)) {
        labels[tagKey.name] = tags.get(tagKey).value;
      }
    });
    return labels;
  }

  /**
   * Register or get a metric in Prometheus
   * @param view View will be used to register the metric
   * @param labels Object with label keys and values
   */
  private registerMetric(view: View, tags: Map<TagKey, TagValue>): Metric {
    const metricName = this.getPrometheusMetricName(view);
    /** Get metric if already registered */
    let metric = this.registry.getSingleMetric(metricName);
    // Return metric if already registered
    if (metric) {
      return metric;
    }

    const labelNames = view.getColumns().map((tagKey) => tagKey.name);
    // Create a new metric if there is no one
    const metricObj = {name: metricName, help: view.description, labelNames};

    // Creating the metric based on aggregation type
    switch (view.aggregation) {
      case AggregationType.COUNT:
        metric = new Counter(metricObj);
        break;
      case AggregationType.SUM:
      case AggregationType.LAST_VALUE:
        metric = new Gauge(metricObj);
        break;
      case AggregationType.DISTRIBUTION:
        this.validateDisallowedLeLabelForHistogram(labelNames);
        const distribution = {
          name: metricName,
          help: view.description,
          labelNames,
          buckets: this.getBoundaries(view, tags)
        };
        metric = new Histogram(distribution);
        break;
      default:
        this.logger.error('Aggregation %s is not supported', view.aggregation);
        return null;
    }

    this.registry.registerMetric(metric);
    return metric;
  }

  /**
   * Update the metric from a measurement value
   * @param view View will be used to update the metric
   * @param measurement Measurement with the new value to update the metric
   */
  private updateMetric(
      view: View, measurement: Measurement, tags: Map<TagKey, TagValue>) {
    const metric = this.registerMetric(view, tags);
    // Updating the metric based on metric instance type and aggregation type
    const labelValues = this.getLabelValues(view.getColumns(), tags);
    if (metric instanceof Counter) {
      metric.inc(labelValues);
    } else if (
        view.aggregation === AggregationType.SUM && metric instanceof Gauge) {
      metric.inc(labelValues, measurement.value);
    } else if (
        view.aggregation === AggregationType.LAST_VALUE &&
        metric instanceof Gauge) {
      metric.set(labelValues, measurement.value);
    } else if (metric instanceof Histogram) {
      metric.observe(labelValues, measurement.value);
    } else {
      this.logger.error('Metric not supported');
    }
  }

  /**
   * Build a metric name from view name
   * @param view View used to build the metric name
   */
  private getPrometheusMetricName(view: View): string {
    let metricName;
    if (this.prefix) {
      metricName = `${this.prefix}_${view.name}`;
    } else {
      metricName = view.name;
    }
    return this.sanitizePrometheusMetricName(metricName);
  }

  /**
   * Sanitize metric name
   * @param name string The name of the metric.
   */
  private sanitizePrometheusMetricName(name: string): string {
    // replace all characters other than [A-Za-z0-9_].
    return name.replace(/\W/g, '_');
  }

  /**
   * Throws an error labels contain "le" label name in histogram label names.
   */
  private validateDisallowedLeLabelForHistogram(labels: string[]): void {
    labels.forEach(label => {
      if (label === PrometheusStatsExporter.RESERVED_HISTOGRAM_LABEL) {
        throw new Error(`${
            PrometheusStatsExporter
                .RESERVED_HISTOGRAM_LABEL} is a reserved label keyword`);
      }
    });
  }

  /**
   * Get the boundaries from buckets
   * @param view View used to get the DistributionData
   * @param tags Tags used to get the DistributionData
   */
  private getBoundaries(view: View, tags: Map<TagKey, TagValue>): number[] {
    const tagValues =
        view.getColumns().map((tagKey) => (tags.get(tagKey) || null));
    const data = view.getSnapshot(tagValues) as DistributionData;
    return data.buckets;
  }

  /**
   * Start the Prometheus exporter server
   */
  startServer(callback?: () => void) {
    const self = this;
    this.app.get('/metrics', (req, res) => {
      res.set(
          'Content-Type', PrometheusStatsExporter.DEFAULT_OPTIONS.contentType);
      res.end(this.registry.metrics());
    });

    this.server = this.app.listen(this.port, () => {
      self.logger.debug('Prometheus Exporter started on port ' + self.port);
      if (callback) {
        callback();
      }
    });
  }

  /**
   * Stop the Prometheus exporter server
   * @param callback
   */
  stopServer(callback?: () => void) {
    if (this.server) {
      this.registry.clear();
      this.server.close(callback);
      this.logger.debug('Prometheus Exporter shutdown');
    }
  }
}
