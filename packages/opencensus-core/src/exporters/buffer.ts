/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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
import * as types from './types';
import * as modelTypes from '../trace/model/types';
import * as configTypes from '../trace/config/types';
import * as loggerTypes from '../common/types';
import * as logger from '../common/console-logger';


/** Controls the sending of traces to exporters. */
export class Buffer {
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
  logger: loggerTypes.Logger;
  /** Trace queue of a buffer */
  queue: modelTypes.RootSpan[] = [];

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

  /**
   * Add a trace (rootSpan) in the buffer.
   * @param trace RootSpan to be added in the buffer.
   */
  addToBuffer(trace: modelTypes.RootSpan) {
    this.queue.push(trace);
    this.logger.debug('BUFFER: added new trace');

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
    this.logger.debug('BUFFER: reset timeout');
    this.resetTimeout = true;
  }

  /** Start the buffer timeout, when finished calls flush method */
  private setBufferTimeout() {
    this.logger.debug('BUFFER: set timerout');
    this.bufferTimeoutInProgress = true;

    setTimeout(() => {
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
  }

  /** Send the trace queue to all exporters */
  private flush() {
    this.exporter.publish(this.queue);
    this.queue = [];
    return this;
  }
}