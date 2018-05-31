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

import {classes, logger, types} from '@opencensus/opencensus-core';
import * as os from 'os';

import {Process, spanToThrift, Tag, ThriftUtils, UDPSender, Utils} from './jaeger-driver';

/**
 * Options for Jaeger configuration
 */
export interface JaegerTraceExporterOptions extends types.ExporterConfig {
  serviceName: string;
  tags?: Tag[];
  host?: string;
  port?: number;
  maxPacketSize?: number;
}


/** Format and sends span information to Jaeger */
export class JaegerTraceExporter implements types.Exporter {
  // Name of the tag used to report client version.
  static readonly JAEGER_OPENCENSUS_EXPORTER_VERSION_TAG_KEY =
      'opencensus.exporter.jaeger.version';
  // host name of the process.
  static readonly TRACER_HOSTNAME_TAG_KEY =
      'opencensus.exporter.jaeger.hostname';
  //  ip of the process.
  static readonly PROCESS_IP = 'ip';

  private process: Process;
  private logger: types.Logger;
  sender: typeof UDPSender;
  queue: types.Span[] = [];
  successCount = 0;
  /** Maximum size of a buffer. */
  private bufferSize: number;
  /** Timeout control */
  /** Max time for a buffer can wait before being sent */
  private bufferTimeout: number;
  /** Manage when the buffer timeout needs to be reseted */
  private resetTimeout = false;
  /** Indicates when the buffer timeout is running */
  private timeoutSet = false;


  constructor(options: JaegerTraceExporterOptions) {
    const pjson = require('../../package.json');
    this.logger = options.logger || logger.logger('debug');
    this.bufferTimeout = options.bufferTimeout;
    this.bufferSize = options.bufferSize;
    this.sender = new UDPSender(options);
    const tags = options.tags || [];
    tags[JaegerTraceExporter.JAEGER_OPENCENSUS_EXPORTER_VERSION_TAG_KEY] =
        `opencensus-exporter-jaeger-${pjson.version}`;
    tags[JaegerTraceExporter.TRACER_HOSTNAME_TAG_KEY] = os.hostname();
    tags[JaegerTraceExporter.PROCESS_IP] = Utils.ipToInt(Utils.myIp());

    this.process = {
      serviceName: options.serviceName,
      tags: options.tags ? ThriftUtils.getThriftTags(tags) : [],
    };
    this.sender.setProcess(this.process);
  }


  // TODO: should be evaluated if onEndSpan should also return a Promise.

  /**
   * Is called whenever a span is ended.
   * @param root the ended span
   */
  onEndSpan(root: types.RootSpan) {
    this.logger.debug('onEndSpan: adding rootSpan: %s', root.name);

    // UDPSender buffer is limited by maxPacketSize
    this.addSpanToSenderBuffer(root)
        .then(result => {
          this.addToBuffer(root, result as number);
          for (const span of root.spans) {
            this.addSpanToSenderBuffer(span)
                .then(result => {
                  this.addToBuffer(span, result as number);
                })
                .catch(err => {
                  return;
                });
          }
        })
        .catch(err => {
          return;
        });

    // Set a buffer timeout
    this.setBufferTimeout();
  }

  /** Not used for this exporter */
  onStartSpan(root: types.RootSpan) {}

  // add span to local queue, which is limited by bufferSize
  private addToBuffer(span: types.Span, numSpans: number) {
    // if UDPSender has flushed his own buffer
    if (numSpans > 0) {
      this.successCount += numSpans;
      // if span was not flushed
      if (numSpans === this.queue.length) {
        this.queue = [span];
      } else {
        this.queue = [];
      }
    } else {
      this.logger.debug('adding to buffer %s', span.name);
      this.queue.push(span);
      if (this.queue.length > this.bufferSize) {
        this.flush();
      }
    }
  }

  // add span to UPDSender buffer
  private addSpanToSenderBuffer(span: types.Span) {
    const thriftSpan = spanToThrift(span);
    return new Promise((resolve, reject) => {
      this.sender.append(thriftSpan, (numSpans: number, err?: string) => {
        if (err) {
          this.logger.error(`failed to add span: ${err}`);
          reject(err);
        } else {
          this.logger.debug('successful append for : %s', numSpans);
          resolve(numSpans);
        }
      });
    });
  }

  /**
   * Publishes a list of root spans to Jaeger.
   * @param rootSpans
   */
  publish(rootSpans: types.RootSpan[]) {
    this.logger.debug('JeagerExport publishing');
    for (const root of rootSpans) {
      if (this.queue.indexOf(root) === -1) {
        this.onEndSpan(root);
      }
    }
    return this.flush();
  }

  private flush() {
    return new Promise((resolve, reject) => {
      try {
        this.sender.flush((numSpans: number, err?: string) => {
          if (err) {
            this.logger.error(`failed to flush span: ${err}`);
            reject(err);
          } else {
            this.logger.debug('successful flush for : %s', numSpans);
            this.successCount += numSpans;
            this.queue = [];
            resolve(numSpans);
          }
        });
      } catch (err) {
        this.logger.error(`failed to flush span: ${err}`);
      }
    });
  }

  close() {
    this.sender.close();
  }

  /** Start the buffer timeout, when finished calls flush method */
  private setBufferTimeout() {
    this.logger.debug('JeagerExporter: set timeout');
    if (this.timeoutSet) {
      return;
    }
    this.timeoutSet = true;

    setTimeout(() => {
      if (this.queue.length === 0) {
        return;
      }
      this.timeoutSet = false;
      this.flush();
    }, this.bufferTimeout);
  }
}
