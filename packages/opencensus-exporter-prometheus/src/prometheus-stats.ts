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

import {AggregationType, DistributionData, ExporterConfig, logger, Logger, Measurement, MeasureUnit, StatsEventListener, Tags, View} from '@opencensus/core';
import * as express from 'express';
import * as http from 'http';
import {Counter, Gauge, Histogram, Metric, Registry} from 'prom-client';

export interface PrometheusExporterOptions extends ExporterConfig {
  /** App prefix for metrics, if needed - default opencensus */
  prefix?: string;
  /**
   * Port number to Prometheus server
   * Default registered port is 9464:
   * https://github.com/prometheus/prometheus/wiki/Default-port-allocations
   */
  port?: number;
  /** Define if the Prometheus server will be started - default false */
  startServer?: boolean;
}

/** Format and sends Stats to Prometheus */
export class PrometheusStatsExporter implements StatsEventListener {
  static readonly DEFAULT_OPTIONS = {
    port: 9464,
    startServer: false,
    contentType: 'text/plain; text/plain; version=0.0.4; charset=utf-8',
    prefix: 'opencensus'
  };

  private logger: Logger;
  private prefix: string;
  private port: number;
  private app = express();
  private server: http.Server;
  // Registry instance from Prometheus to keep the metrics
  private registry = new Registry();

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
   * @param views
   * @param measurement
   */
  onRecord(views: View[], measurement: Measurement) {
    for (const view of views) {
      this.updateMetric(view, measurement);
    }
  }

  /**
   * Register or get a metric in Prometheus
   * @param view View will be used to register the metric
   * @param tags Optional, used only for histogram metric
   */
  private registerMetric(view: View, tags?: Tags): Metric {
    const metricName = this.getPrometheusMetricName(view);
    /** Get metric if already registered */
    let metric = this.registry.getSingleMetric(metricName);
    // Return metric if already registered
    if (metric) {
      return metric;
    }

    // Create a new metric if there is no one
    const metricObj = {
      name: metricName,
      help: view.description,
      labelNames: view.getColumns()
    };

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
        const distribution = {
          name: metricName,
          help: view.description,
          labelNames: view.getColumns(),
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
  private updateMetric(view: View, measurement: Measurement) {
    const metric = this.registerMetric(view, measurement.tags);
    // Updating the metric based on metric instance type and aggregation type
    if (metric instanceof Counter) {
      metric.inc(measurement.tags);
    } else if (
        view.aggregation === AggregationType.SUM && metric instanceof Gauge) {
      metric.inc(measurement.tags, measurement.value);
    } else if (
        view.aggregation === AggregationType.LAST_VALUE &&
        metric instanceof Gauge) {
      metric.set(measurement.tags, measurement.value);
    } else if (metric instanceof Histogram) {
      metric.observe(measurement.tags, measurement.value);
    } else {
      this.logger.error('Metric not supported');
    }
  }

  /**
   * Build a metric name from view name
   * @param view View used to build the metric name
   */
  private getPrometheusMetricName(view: View): string {
    return `${this.prefix}_${view.name}_${this.getUnit(view)}`;
  }

  /**
   * Get a string unit type based on measure unit
   * @param view View used to get the unit
   */
  private getUnit(view: View): string {
    switch (view.measure.unit) {
      case MeasureUnit.UNIT:
        return 'total';
      case MeasureUnit.BYTE:
        return 'bytes';
      case MeasureUnit.KBYTE:
        return 'kbytes';
      case MeasureUnit.SEC:
        return 'seconds';
      case MeasureUnit.MS:
        return 'milliseconds';
      case MeasureUnit.NS:
        return 'nanoseconds';
      default:
        return '';
    }
  }

  /**
   * Get the boundaries from buckets
   * @param view View used to get the DistributionData
   * @param tags Tags used to get the DistributionData
   */
  private getBoundaries(view: View, tags: Tags): number[] {
    const data = view.getSnapshot(tags) as DistributionData;
    return data.buckets.map(b => b.lowBoundary).filter(b => b !== -Infinity);
  }

  /**
   * Start the Prometheus server
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
   * Stop the Prometheus server
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
