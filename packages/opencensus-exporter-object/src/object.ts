/**
 * Copyright 2019 OpenCensus Authors.
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

import {
  Exporter,
  ExporterBuffer,
  ExporterConfig,
  Span,
} from '@opencensus/core';
import { logger, Logger } from '@opencensus/core';

/** Object Exporter manager class */
export class ObjectTraceExporter implements Exporter {
  buffer: ExporterBuffer;
  logger: Logger;
  startedSpans: Span[] = [];
  endedSpans: Span[] = [];
  publishedSpans: Span[] = [];

  constructor(options: ExporterConfig = {}) {
    this.buffer = new ExporterBuffer(this, options);
    this.logger = options.logger || logger.logger();
  }

  /**
   * Is called whenever a span is started.
   * @param span the started span
   */
  onStartSpan(span: Span) {
    this.startedSpans.push(span);
  }

  /**
   * Is called whenever a span is ended.
   * @param span the ended span
   */
  onEndSpan(span: Span) {
    this.endedSpans.push(span);
    this.buffer.addToBuffer(span);
  }

  /**
   * Send the spans to memory store.
   * @param spans The list of spans to transmit to memory.
   */
  publish(spans: Span[]): Promise<void> {
    this.publishedSpans.push(...spans);
    return Promise.resolve();
  }

  /**
   * Reset in-memory stores.
   */
  reset() {
    this.startedSpans = [];
    this.endedSpans = [];
    this.publishedSpans = [];
  }
}
