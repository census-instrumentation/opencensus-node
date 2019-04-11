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

import {Exporter, ExporterConfig, Span} from '@opencensus/core';
import {logger, Logger} from '@opencensus/core';
import * as os from 'os';
import {spanToThrift, Tag, TagValue, ThriftProcess, ThriftUtils, UDPSender, Utils} from './jaeger-driver';

const DEFAULT_BUFFER_FLUSH_INTERVAL_MILLIS = 1000;
const DEFAULT_BUFFER_SIZE = 1000;

/**
 * Options for Jaeger configuration
 */
export interface JaegerTraceExporterOptions extends ExporterConfig {
  serviceName: string;
  tags?: Tag[];
  host?: string;
  port?: number;
  maxPacketSize?: number;
}

// Load the package details. Note that the `require` is performed at runtime,
// which means package.json will be relative to the location of this file.
// If this file has been compiled, it will be in the `/build` directory, so the
// package path is relative to that location.  Otherwise, it will be relative
// to the original .ts file.
let pjsonVersion: string;
try {
  pjsonVersion = require('../../package.json');
} catch {
  pjsonVersion = require('../package.json');
}

/** Format and sends span information to Jaeger */
export class JaegerTraceExporter implements Exporter {
  // Name of the tag used to report client version.
  static readonly JAEGER_OPENCENSUS_EXPORTER_VERSION_TAG_KEY =
      'opencensus.exporter.jaeger.version';
  // host name of the process.
  static readonly TRACER_HOSTNAME_TAG_KEY =
      'opencensus.exporter.jaeger.hostname';
  //  ip of the process.
  static readonly PROCESS_IP = 'ip';

  private process: ThriftProcess;
  private logger: Logger;
  sender: typeof UDPSender;
  queue: Span[] = [];
  successCount = 0;
  /** Maximum size of a buffer. */
  private bufferSize: number;
  /** Timeout control */
  /** Max time for a buffer can wait before being sent */
  private bufferTimeout: number;
  /** Indicates when the buffer timeout is running */
  private timeoutSet = false;

  constructor(options: JaegerTraceExporterOptions) {
    this.logger = options.logger || logger.logger();
    this.bufferTimeout =
        options.bufferTimeout || DEFAULT_BUFFER_FLUSH_INTERVAL_MILLIS;
    this.bufferSize = options.bufferSize || DEFAULT_BUFFER_SIZE;
    this.sender = new UDPSender(options);
    const tags: Tag[] = options.tags || [];

    const defaultTags: Record<string, TagValue> = {};
    defaultTags[JaegerTraceExporter
                    .JAEGER_OPENCENSUS_EXPORTER_VERSION_TAG_KEY] =
        `opencensus-exporter-jaeger-${pjsonVersion}`;
    defaultTags[JaegerTraceExporter.TRACER_HOSTNAME_TAG_KEY] = os.hostname();
    defaultTags[JaegerTraceExporter.PROCESS_IP] = Utils.ipToInt(Utils.myIp());

    // Merge the user given tags and the default tags
    const _tags: Tag[] = [...tags, ...Utils.convertObjectToTags(defaultTags)];
    this.process = {
      serviceName: options.serviceName,
      tags: ThriftUtils.getThriftTags(_tags),
    };
    this.sender.setProcess(this.process);
  }


  // TODO: should be evaluated if onEndSpan should also return a Promise.

  /**
   * Is called whenever a span is ended.
   * @param root the ended span
   */
  onEndSpan(root: Span) {
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
  onStartSpan(root: Span) {}

  // add span to local queue, which is limited by bufferSize
  private addToBuffer(span: Span, numSpans: number) {
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
  private addSpanToSenderBuffer(span: Span) {
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
  publish(rootSpans: Span[]) {
    this.logger.debug('JaegerExport publishing');
    for (const root of rootSpans) {
      if (this.queue.indexOf(root) === -1) {
        this.onEndSpan(root);
      }
    }
    return this.flush();
  }

  private flush(): Promise<number> {
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
    this.logger.debug('JaegerExporter: set timeout');
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
