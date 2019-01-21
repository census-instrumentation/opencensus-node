/**
 * Copyright 2018 OpenCensus Authors.
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

import {AggregationData, Exporter, ExporterConfig, Measure, Measurement, RootSpan, Span, StatsEventListener, TagKey, TagValue, View} from '@opencensus/core';
import {logger, Logger} from '@opencensus/core';
import * as express from 'express';
import * as http from 'http';
import {createRoutes} from './zpages-frontend/routes';

/** Interface to Zpages options */
export interface ZpagesExporterOptions extends ExporterConfig {
  /** Port number to Zpages server */
  port: number;
  /** Predefined span names to register on trace list */
  spanNames: string[];
  /** Define if the Zpages server will start with new instance */
  startServer: boolean;
}

export interface StatsParams {
  registeredViews: View[];
  registeredMeasures: Measure[];
  recordedData: {[key: string]: AggregationData[]};
}

/** Class to ZpagesExporter */
export class ZpagesExporter implements Exporter, StatsEventListener {
  /** ZpagesExporter default options */
  static readonly defaultOptions = {port: 8080, startServer: true};

  private app: express.Application;
  private server: http.Server;
  private port: number;
  private traces: Map<string, Span[]> = new Map();
  private logger: Logger;
  private statsParams = {
    registeredViews: [],
    registeredMeasures: [],
    recordedData: {}
  } as StatsParams;

  constructor(options: ZpagesExporterOptions) {
    /** create express app */
    this.app = express();
    this.port = options.port || ZpagesExporter.defaultOptions.port;
    this.logger = options.logger || logger.logger();
    const startServer = options.startServer != null ?
        options.startServer :
        ZpagesExporter.defaultOptions.startServer;

    /** register predefined span names, if any */
    if (options.spanNames) {
      this.registerSpanNames(options.spanNames);
    }

    /** defining routes */
    this.app.use(createRoutes(this.traces, this.statsParams));

    /** start the server if the startServer option is true */
    if (startServer) {
      this.startServer();
    }
  }

  /**
   * Called whenever a span is started.
   * @param root the started span
   */
  onStartSpan(root: RootSpan) {
    this.sendTrace(root);
  }

  /**
   * Called whenever a span is ended.
   * @param root the ended span
   */
  onEndSpan(root: RootSpan) {
    this.sendTrace(root);
  }

  /**
   * Called whenever a view is registered
   * @param view the registered view
   */
  onRegisterView(view: View): void {
    // Adds the view to registeredViews array if it doesn't contain yet
    if (!this.statsParams.registeredViews.find(v => v.name === view.name)) {
      this.statsParams.registeredViews.push(view);
    }
    // Adds the measure to registeredMeasures array if it doesn't contain yet
    if (!this.statsParams.registeredMeasures.find(
            m => m.name === view.measure.name)) {
      this.statsParams.registeredMeasures.push(view.measure);
    }
  }

  /**
   * Called whenever a measurement is recorded
   * @param views the view list where the measurement was recorded
   * @param measurement the recorded measurement
   * @param tags The tags to which the value is applied
   */
  onRecord(
      views: View[], measurement: Measurement,
      tags: Map<TagKey, TagValue>): void {
    const tagValues = [...tags.values()];
    views.map(view => {
      const snapshot = view.getSnapshot(tagValues);
      // Check if there is no data for the current view
      if (!this.statsParams.recordedData[view.name]) {
        this.statsParams.recordedData[view.name] = [snapshot];
      } else if (!this.statsParams.recordedData[view.name].find(
                     s => s === snapshot)) {
        // Push the snapshot if it hasn't recoreded before
        this.statsParams.recordedData[view.name].push(snapshot);
      }
    });
  }

  start(): void {
    // TODO(mayurkale): dependency with PR#253.
  }

  /**
   * Send a trace to traces array
   * @param trace the rootSpan to be sent to the array list
   */
  private sendTrace(trace: RootSpan) {
    /** If there is no status, put status 0 (OK) */
    if (!trace.status) {
      trace.status = 0;
    }
    this.pushSpan(trace);

    for (const span of trace.spans) {
      /** If there is no status, put status 0 (OK) */
      if (!span.status) {
        span.status = 0;
      }
      this.pushSpan(span);
    }
    this.logger.debug('Z-PAGES: trace added');
  }

  /**
   * Push a span to the array list
   * @param span the span to be push to the array list
   */
  private pushSpan(span: Span): void {
    if (this.traces.has(span.name)) {
      const spans = this.traces.get(span.name)!;
      // if a trace already in list, just update
      for (let i = 0; i < spans.length; i++) {
        if (spans[i].id === span.id) {
          spans[i] = span;
          return;
        }
      }
      spans.push(span);
    } else {
      this.traces.set(span.name, [span]);
    }
  }

  /**
   * Register a span names array in the Zpages Exporter
   * @param spanNames
   */
  private registerSpanNames(spanNames: string[]) {
    for (const name of spanNames) {
      const span = {name} as Span;
      this.traces.set(name, [span]);
    }
  }

  /**
   * Not used in this context.
   * @param spans
   */
  publish(spans: Span[]) {
    return Promise.resolve();
  }

  /**
   * Start the Zpages HTTP Server.
   * @param callback A function that will be called when the server has started.
   */
  startServer(callback?: () => void) {
    const self = this;
    this.server = this.app.listen(self.port, () => {
      self.logger.debug('Zpages Server was started on port ' + self.port);
      if (callback) {
        callback();
      }
    });
  }

  /**
   * Stop the Zpages HTTP Server.
   * @param callback A function that will be called when the server is stopped.
   */
  stopServer(callback?: () => void) {
    this.server.close(callback);
  }
}
