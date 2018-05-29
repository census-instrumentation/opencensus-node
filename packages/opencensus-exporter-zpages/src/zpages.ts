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

import {types} from '@opencensus/opencensus-core';
import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';
import * as express from 'express';
import * as http from 'http';
import * as url from 'url';
import {Span} from '../../opencensus-core/build/src/index-classes';

/** Interface to Zpages options */
export interface ZpagesExporterOptions extends types.ExporterConfig {
  /** Port number to Zpages server */
  port: number;
  /** Predefined span names to register on trace list */
  spanNames: string[];
  /** Define if the Zpages server will start with new instance */
  startServer: boolean;
}

export type TraceMap = {
  [spanName: string]: types.Span[];
};

/** Class to ZpagesExporter */
export class ZpagesExporter implements types.Exporter {
  private app: express.Application;
  private server;
  private port: number;
  private traces: TraceMap = {};
  buffer: classes.ExporterBuffer;
  logger: types.Logger;
  defaultConfig: types.TracerConfig;
  /** ZpagesExporter default options */
  defaultOptions = {port: 8080, startServer: true} as ZpagesExporterOptions;

  constructor(options: ZpagesExporterOptions) {
    /** create express app */
    this.app = express();
    this.port = options.port || this.defaultOptions.port;
    this.buffer = new classes.ExporterBuffer(this, options);
    this.logger = options.logger || logger.logger();
    const startServer = options.startServer != null ?
        options.startServer :
        this.defaultOptions.startServer;

    /** register predefined span names, if any */
    if (options.spanNames) {
      this.registerSpanNames(options.spanNames);
    }

    /** importing the routes */
    require('./zpages-frontend/routes')(this.app);

    /** start the server if the startServer option is true */
    if (startServer) {
      this.startServer();
    }
  }

  /**
   * Is called whenever a span is started.
   * @param root the started span
   */
  onStartSpan(root: types.RootSpan) {
    this.sendTrace(root);
  }

  /**
   * Is called whenever a span is ended.
   * @param root the ended span
   */
  onEndSpan(root: types.RootSpan) {
    this.sendTrace(root);
  }

  /**
   * Send a trace to traces array
   * @param trace the rootSpan to be sent to the array list
   */
  private sendTrace(trace: types.RootSpan) {
    this.pushSpan(trace);

    for (const span of trace.spans) {
      this.pushSpan(span);
    }
    this.logger.debug('Z-PAGES: trace added');
  }

  /**
   * Push a span to the array list
   * @param span the span to be push to the array list
   */
  private pushSpan(span: types.Span): void {
    if (this.traces[span.name]) {
      // if a trace already in list, just update
      for (let i = 0; i < this.traces[span.name].length; i++) {
        if (this.traces[span.name][i].id === span.id) {
          this.traces[span.name][i] = span;
          return;
        }
      }
      this.traces[span.name].push(span);
    } else {
      this.traces[span.name] = [span];
    }
  }

  /**
   * Register a span names array in the Zpages Exporter
   * @param spanNames
   */
  registerSpanNames(spanNames: string[]) {
    for (const name of spanNames) {
      const span = {name} as types.Span;
      this.traces[name] = [span];
    }
  }

  /**
   * Get all traces or traces by name from the trace list
   * @param traceName name of the rootSpan to be get
   */
  getTraces(traceName?: string): TraceMap|types.Span[] {
    logger.logger().debug('Z-PAGES: returning from trace list');

    if (traceName) {
      return this.traces[traceName];
    }

    return this.traces;
  }

  /**
   * Not used in this context
   * @param spans
   */
  publish(spans: types.Span[]) {}

  /**
   * Start the Zpages HTTP Server
   * @param callback Function that will run after server starts
   */
  startServer(callback?: Function) {
    const self = this;
    this.server = this.app.listen(self.port, () => {
      self.logger.debug('Zpages Server was started on port ' + self.port);
      if (callback) {
        callback();
      }
    });
  }

  /**
   * Stop the Zpages HTTP Server
   */
  stopServer() {
    this.server.close();
  }
}
