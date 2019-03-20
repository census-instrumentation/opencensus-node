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

import * as protoLoader from '@grpc/proto-loader';
import {Exporter, ExporterBuffer, ExporterConfig, logger, Logger, Span, version as coreVersion} from '@opencensus/core';
import * as grpc from 'grpc';
import * as os from 'os';
import {adaptRootSpan, createNode} from './adapters';
import {opencensus, TraceServiceClient, TraceServiceExportStream} from './types';

/**
 * Options for OpenCensus Agent Exporter configuration.
 */
export interface OCAgentExporterOptions extends ExporterConfig {
  serviceName: string;
  host?: string;
  port?: number;
  credentials?: grpc.ChannelCredentials;
  attributes?: Record<string, string>;
}

const DEFAULT_OPTIONS: OCAgentExporterOptions = {
  serviceName: 'Anonymous Service',
  host: 'localhost',
  port: 55678,
  credentials: grpc.credentials.createInsecure(),
  logger: logger.logger()
};

/**
 * grpc.Client typed event names
 */
enum StreamEvent {
  Data = 'data',
  Status = 'status',
  Error = 'error',
  Metadata = 'metadata'
}

/**
 * Format and send span information to the OpenCensus Agent. Also receives and
 * applies configuration changes from the Agent.
 */
export class OCAgentExporter implements Exporter {
  // Logger
  private logger: Logger;

  // Span buffer
  private buffer: ExporterBuffer;

  // Connection objects
  private traceServiceClient: TraceServiceClient;
  private exportStream: TraceServiceExportStream|undefined;

  // Resolved configuration options
  private config: OCAgentExporterOptions;

  // Node properties
  private exporterVersion: string;
  private coreVersion: string;
  private hostName: string;
  private processStartTimeMillis: number;

  private activeLocal = false;

  constructor(options: OCAgentExporterOptions) {
    // Get the complete set of options from the defaults and inputs
    this.config = Object.assign({}, DEFAULT_OPTIONS, options);
    this.logger = this.config.logger as Logger;

    // Create buffer
    this.buffer = new ExporterBuffer(this, this.config);

    /**
     * Get node properties
     */
    this.exporterVersion = require('../../package.json').version;
    this.coreVersion = coreVersion;
    this.hostName = os.hostname();
    this.processStartTimeMillis = Date.now() - (process.uptime() * 1000);

    /**
     * Generate grpc services from the proto files.
     */
    const traceServiceProtoPath =
        'opencensus/proto/agent/trace/v1/trace_service.proto';
    const includeDirs = [
      __dirname + '/protos',
    ];
    // tslint:disable-next-line:no-any
    const proto: any =
        grpc.loadPackageDefinition(protoLoader.loadSync(traceServiceProtoPath, {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
          includeDirs
        }));

    /**
     * Connect to the trace service and connect to the config and export
     * streams.
     */
    const serverAddress = `${this.config.host}:${this.config.port}`;
    this.traceServiceClient =
        new proto.opencensus.proto.agent.trace.v1.TraceService(
            serverAddress, this.config.credentials);
    this.start();
  }

  get active(): boolean {
    return this.activeLocal;
  }

  /**
   * Starts the exporter.
   */
  start() {
    if (this.active) {
      return;
    }

    this.activeLocal = true;
    this.connectToExportStream();
  }

  /**
   * Stops the exporter.
   */
  stop() {
    if (!this.active) {
      return;
    }

    if (this.exportStream) {
      this.exportStream.end();
    }
    this.activeLocal = false;
  }

  /**
   * Creates a connection to the export stream. If the stream cannot be
   * connected to or if the stream is broken at any point, we attempt to
   * reconnect.
   */
  private connectToExportStream() {
    if (!this.active) {
      return;
    }

    this.exportStream = this.traceServiceClient.export();
    this.exportStream.on(StreamEvent.Metadata, () => {
      this.logger.info('OCAgent: export stream connected');
    });
    this.exportStream.on(
        StreamEvent.Data,
        (message:
             opencensus.proto.agent.trace.v1.ExportTraceServiceResponse) => {
            // no-op: We must listen on the "data" event otherwise we won't
            // receive status events.
        });
    this.exportStream.on(StreamEvent.Status, (status: grpc.StatusObject) => {
      // Attempt reconnect if appropriate. The grpc client will perform a
      // backoff internally.
      if (this.shouldAttemptReconnect(status)) {
        this.logger.error(
            `OCAgent: export stream disconnected; attempting reconnect`);
        setTimeout(() => this.connectToExportStream(), 250);
      }
    });
    this.exportStream.on(StreamEvent.Error, (err) => {
      // no-op: Swallow errors to keep the process alive. Not listening
      // to this event will exit the process on an error.
      this.logger.error('OCAgent: export stream error', err);
    });
  }

  /**
   * Determines if a reconnect should be attempted, based on the grpc status.
   * @param status grpc.StatusObject
   * @returns boolean
   */
  private shouldAttemptReconnect(status: grpc.StatusObject): boolean {
    switch (status.code) {
      case grpc.status.UNKNOWN:      // stream disconnected
      case grpc.status.UNAVAILABLE:  // stream could not be established
        return true;
      default:
        return false;
    }
  }

  onStartSpan(root: Span) {}

  onEndSpan(root: Span) {
    this.buffer.addToBuffer(root);
  }

  publish(rootSpans: Span[]): Promise<number|string|void> {
    return new Promise((resolve, reject) => {
      this.logger.info(`OCAgent: publish rootSpans=${rootSpans.length}`);

      if (!this.exportStream) {
        this.logger.warn(
            'OCAgent: Export stream not connected. Could not publish spans.');
        return reject();
      }

      // Create node details
      const node = createNode({
        serviceName: this.config.serviceName,
        exporterVersion: this.exporterVersion,
        coreVersion: this.coreVersion,
        hostName: this.hostName,
        processStartTimeMillis: this.processStartTimeMillis,
        attributes: this.config.attributes
      });

      // Adapt and write each RootSpan to the agent through the export stream.
      // Any failed attempts will be caught by the connection, but the data
      // will be lost.
      rootSpans.forEach(rootSpan => {
        if (this.exportStream) {
          this.exportStream.write({node, spans: adaptRootSpan(rootSpan)});
        }
      });

      resolve();
    });
  }
}
