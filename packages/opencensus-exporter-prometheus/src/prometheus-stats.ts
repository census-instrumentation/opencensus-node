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

import {Distribution, ExporterConfig, logger, Logger, Measure, Measurement, MeasureUnit} from '@opencensus/core';
import {MetricValuesTypes, SingleValue, StatsExporter, Tags, View} from '@opencensus/core';
import * as express from 'express';
import * as http from 'http';


export interface PrometheusExporterOptions extends ExporterConfig {
  /** app prefix for metrics, if needed - default opencensus */
  prefix?: string;
  /**
   * Port number to Prometheus server
   *
   * Default registered port is 9464:
   * https://github.com/prometheus/prometheus/wiki/Default-port-allocations
   *
   */
  port?: number;
  /** Define if the Zpages server will start with new instance */
  startServer?: boolean;
}

/** Format and sends Stats to Stackdriver */
export class PrometheusStatsExporter implements StatsExporter {
  static readonly defaultOptions = {port: 9464, startServer: true};

  private logger: Logger;
  private options: PrometheusExporterOptions;
  private prefix: string;
  private viewList: View[] = [];
  private port: number;
  private app = express();
  private server: http.Server;
  private started: boolean;

  constructor(options: PrometheusExporterOptions) {
    this.options = options;
    this.logger = options.logger || logger.logger();
    this.port = options.port || PrometheusStatsExporter.defaultOptions.port;
    this.prefix = (options.prefix === null || options.prefix === undefined) ?
        'opencensus' :
        options.prefix;

    /** start the server if the startServer option is true */
    if (options.startServer) {
      console.log('shouldStart');
      this.startServer();
    }
  }

  getViewList() {
    return this.viewList;
  }

  onRegisterView(view: View): void {
    this.viewList.push(view);
  }

  onRecord(view: View): void {
    // nothing todo hear
  }

  private getPrometheusMetricsString(): string {
    let prometheusMetric: string[] = [];
    this.viewList.forEach((view: View) => {
      const values = view.getSnapshotValues();

      if (values.length > 0) {
        const prometeusMetricName = this.getPrometheusMetricName(view);

        prometheusMetric.push(
            `# HELP ${prometeusMetricName} ${view.description}`);
        prometheusMetric.push(
            `# TYPE ${prometeusMetricName} ${view.metric.type}`);

        for (const value of values) {
          if (value.type === MetricValuesTypes.single) {
            const singleValue = value as SingleValue;
            prometheusMetric.push(`${prometeusMetricName}${
                this.tagsToPrometheus(singleValue.tags)} ${singleValue.value} ${
                singleValue.timestamp}`);
          } else {
            const distribution = value as Distribution;

            prometheusMetric =
                prometheusMetric.concat(this.getPrometheusBucketString(
                    prometeusMetricName, distribution));
            prometheusMetric.push(`${prometeusMetricName}_sum${
                this.tagsToPrometheus(distribution.tags)} ${distribution.sum}`);
            prometheusMetric.push(`${prometeusMetricName}_count${
                this.tagsToPrometheus(
                    distribution.tags)} ${distribution.count}`);
          }
        }
        prometheusMetric.push('');
      }
    });
    return prometheusMetric.join('\n');
  }

  private getPrometheusMetricName(view: View) {
    const prefix = (this.prefix && this.prefix !== '') ? `${this.prefix}_` : '';
    const metricName = `${prefix}${view.name}_${this.getUnit(view)}`;
    const prometeusMetricName = this.normalizeNameForPrometheus(metricName);
    return prometeusMetricName;
  }

  private tagsToPrometheus(tags: Tags): string {
    let labels = Object.keys(tags);
    if (labels.length > 1) {
      labels = labels.sort();
    }
    const body: string[] = [];
    labels.forEach(
        label => body.push(
            `${this.normalizeNameForPrometheus(label)}="${tags[label]}"`));

    return (body.length > 0) ? `{${body.join(',')}}` : '';
  }

  private normalizeNameForPrometheus(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private getUnit(view: View): string {
    let result = '';
    switch (view.measure.unit) {
      case MeasureUnit.byte:
        result = 'bytes';
        break;
      case MeasureUnit.kbyte:
        result = 'Kbytes';
        break;
      case MeasureUnit.sec:
        result = 'seconds';
        break;
      case MeasureUnit.ms:
        result = 'milliseconda';
        break;
      case MeasureUnit.ns:
        result = 'nanoseconda';
        break;
      default:
        result = '';
    }
    return result;
  }

  private getPrometheusBucketString(
      metricName: string, distribution: Distribution): string[] {
    const result: string[] = [];
    let labels = Object.keys(distribution.tags);
    if (labels.length > 1) {
      labels = labels.sort();
    }
    const tagBody: string[] = [];
    labels.forEach(
        label => tagBody.push(`${this.normalizeNameForPrometheus(label)}="${
            distribution.tags[label]}"`));

    const strTags = tagBody.join(',');
    const boundaries = distribution.boundaries.bucketBoundaries;
    for (let i = 0; i < boundaries.length; i++) {
      result.push(`${metricName}_bucket{le=\"${boundaries[i]}\",${strTags}} ${
          distribution.buckets[i].count}`);
    }
    result.push(
        `${metricName}_bucket{le=\"+Inf\",${strTags}} ${distribution.count}`);
    return result;
  }

  /**
   * Start the Prometheus Exporter service
   */
  startServer(callback?: () => void) {
    const self = this;
    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', this.contentType);
      res.end(this.getPrometheusMetricsString());
    });

    console.log('Prometheus Exporter started on port ' + this.port);
    this.server = this.app.listen(this.port, () => {
      self.logger.debug('Prometheus Exporter started on port ' + self.port);
      if (callback) {
        callback();
      }
    });
    this.started = true;
  }

  stopServer(callback?: () => void) {
    if (this.server && this.started) {
      this.server.close(callback);
      console.log('Prometheus Exporter shutdown');
      this.logger.debug('Prometheus Exporter shutdown');
    }
    this.started = false;
  }

  get contentType() {
    return 'text/plain; text/plain; version=0.0.4; charset=utf-8';
  }
}
