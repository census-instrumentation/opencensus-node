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

import * as uuidv4 from 'uuid/v4';
import * as logger from '../common/console-logger';
import * as loggerTypes from '../common/types';
import * as configTypes from '../trace/config/types';
import * as modelTypes from '../trace/model/types';
import * as types from './types';


/** Controls the sending of traces to exporters. */
export class ExporterBuffer {
  /** The service to send the collected spans. */
  private exporter: types.Exporter;
  /** Maximum size of a buffer. */
  private bufferSize: number;
  /** Max time for a buffer can wait before being sent */
  private bufferTimeout: number;
  /** Manage when the buffer timeout needs to be reseted */
  private resetTimeout = false;
  /** Indicates when the buffer timeout is running */
  private bufferTimeoutInProgress = false;
  /** An object to log information to */
  private logger: loggerTypes.Logger;
  /** Trace queue of a buffer */
  private queue: modelTypes.RootSpan[] = [];

  /**
   * Constructs a new Buffer instance.
   * @param exporter The service to send the collected spans.
   * @param config A buffer configuration object to create a buffer.
   */
  constructor(exporter: types.Exporter, config: configTypes.BufferConfig) {
    this.exporter = exporter;
    this.logger = config.logger || logger.logger();
    this.bufferSize = config.bufferSize;
    this.bufferTimeout = config.bufferTimeout;
    return this;
  }

  /**
   * Set the buffer size value.
   * @param bufferSize The new buffer size.
   */
  setBufferSize(bufferSize: number) {
    this.bufferSize = bufferSize;
    return this;
  }

  getBufferSize(): number {
    return this.bufferSize;
  }

  getQueue(): modelTypes.RootSpan[] {
    return this.queue;
  }
  /**
   * Add a rootSpan in the buffer.
   * @param root RootSpan to be added in the buffer.
   */
  addToBuffer(root: modelTypes.RootSpan) {
    this.queue.push(root);
    this.logger.debug('ExporterBuffer: added new rootspan');

    if (this.queue.length > this.bufferSize) {
      this.flush();
    }

    if (this.bufferTimeoutInProgress) {
      this.resetBufferTimeout();
    } else {
      this.setBufferTimeout();
    }

    return this;
  }

  /** Reset the buffer timeout */
  private resetBufferTimeout() {
    this.logger.debug('ExporterBuffer: reset timeout');
    this.resetTimeout = true;
  }

  /** Start the buffer timeout, when finished calls flush method */
  private setBufferTimeout() {
    this.logger.debug('ExporterBuffer: set timeout');
    this.bufferTimeoutInProgress = true;

    const timer = setTimeout(() => {
      if (this.queue.length === 0) {
        return;
      }

      if (this.resetTimeout) {
        this.resetTimeout = false;
        this.setBufferTimeout();
      } else {
        this.bufferTimeoutInProgress = false;
        this.flush();
      }
    }, this.bufferTimeout);
    // Don't let this timer be the only thing keeping the process alive
    timer.unref();
  }

  /** Send the trace queue to all exporters */
  private flush() {
    this.exporter.publish(this.queue);
    this.queue = [];
    return this;
  }
}
