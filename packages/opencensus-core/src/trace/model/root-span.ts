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

import * as uuid from 'uuid';

import {Clock} from '../../internal/clock';
import {debug} from '../../internal/util';

import {Span} from './span';
import {SpanBaseModel} from './span-base-model';
import {Tracer} from './tracer';

import * as logger from '../../common/console-logger';
import * as types from './types';

/** Defines a root span */
export class RootSpan extends SpanBaseModel implements types.RootSpan {
  /** A tracer object */
  private tracer: Tracer;
  /** A list of child spans. */
  private spansLocal: Span[];
  /** It's trace ID. */
  private traceIdLocal: string;

  /**
   * Constructs a new RootSpanImpl instance.
   * @param tracer A tracer object.
   * @param context A trace options object to build the root span.
   */
  constructor(tracer: Tracer, context?: types.TraceOptions) {
    super();
    this.tracer = tracer;
    this.traceIdLocal =
        context && context.traceContext && context.traceContext.traceId ?
        context.traceContext.traceId :
        (uuid.v4().split('-').join(''));
    this.name = context && context.name ? context.name : 'undefined';
    if (context && context.traceContext) {
      this.parentSpanId = context.traceContext.spanId || '';
    }
    this.spansLocal = [];
    this.logger = tracer.logger || logger.logger();
  }

  /** Gets span list from rootspan instance. */
  get spans(): Span[] {
    return this.spansLocal;
  }

  /** Gets trace id from rootspan instance. */
  get traceId(): string {
    return this.traceIdLocal;
  }

  /** Starts a rootspan instance. */
  start() {
    super.start();
    this.logger.debug(
        'starting %s  %o', this.className,
        {traceId: this.traceId, id: this.id, parentSpanId: this.parentSpanId});
  }

  /** Ends a rootspan instance. */
  end() {
    super.end();

    // TODO - Define logic for list of spans
    for (const span of this.spansLocal) {
      if (!span.ended && span.started) {
        span.truncate();
      }
    }

    this.tracer.onEndSpan(this);
  }

  /**
   * Event called when a span is ended.
   * @param span Span ended.
   */
  onEndSpan(span: Span) {
    this.logger.debug('ending span  %o', {
      id: span.id,
      traceId: span.traceId,
      name: span.name,
      startTime: span.startTime,
      endTime: span.endTime,
      duration: span.duration
    });
  }

  /**
   * Starts a new child span in the root span.
   * @param name Span name.
   * @param type Span type.
   * @param parentSpanId Span parent ID.
   */
  startSpan(name: string, type: string, parentSpanId?: string) {
    if (this.ended) {
      this.logger.debug(
          'calling %s.startSpan() on ended %s %o', this.className,
          this.className, {id: this.id, name: this.name, type: this.type});
      return null;
    }
    if (!this.started) {
      this.logger.debug(
          'calling %s.startSpan() on un-started %s %o', this.className,
          this.className, {id: this.id, name: this.name, type: this.type});
      return null;
    }
    const newSpan = new Span(this);
    if (name) {
      newSpan.name = name;
    }
    if (type) {
      newSpan.type = type;
    }
    newSpan.start();
    this.spansLocal.push(newSpan);
    return newSpan;
  }
}
