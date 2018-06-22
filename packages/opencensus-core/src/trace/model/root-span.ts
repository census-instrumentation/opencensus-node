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

import * as uuid from 'uuid';

import * as logger from '../../common/console-logger';
import {Clock} from '../../internal/clock';

import {Span} from './span';
import {SpanBase} from './span-base';
import * as types from './types';


/** Defines a root span */
export class RootSpan extends SpanBase implements types.RootSpan {
  /** A tracer object */
  private tracer: types.Tracer;
  /** A list of child spans. */
  private spansLocal: types.Span[];
  /** It's trace ID. */
  private traceIdLocal: string;

  /**
   * Constructs a new RootSpanImpl instance.
   * @param tracer A tracer object.
   * @param context A trace options object to build the root span.
   */
  constructor(tracer: types.Tracer, context?: types.TraceOptions) {
    super();
    this.tracer = tracer;
    this.traceIdLocal =
        context && context.spanContext && context.spanContext.traceId ?
        context.spanContext.traceId :
        (uuid.v4().split('-').join(''));
    this.name = context && context.name ? context.name : 'undefined';
    if (context && context.spanContext) {
      this.parentSpanId = context.spanContext.spanId || '';
    }
    this.spansLocal = [];
    this.kind = context && context.kind ? context.kind : null;
    this.logger = tracer.logger || logger.logger();
  }

  /** Gets span list from rootspan instance. */
  get spans(): types.Span[] {
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

    this.tracer.onStartSpan(this);
  }

  /** Ends a rootspan instance. */
  end() {
    super.end();

    for (const span of this.spansLocal) {
      if (!span.ended && span.started) {
        span.truncate();
      }
    }

    this.tracer.onEndSpan(this);
  }


  /**
   * Starts a new child span in the root span.
   * @param name Span name.
   * @param kind Span kind.
   * @param parentSpanId Span parent ID.
   */
  startChildSpan(name: string, kind: string, parentSpanId?: string):
      types.Span {
    if (this.ended) {
      this.logger.debug(
          'calling %s.startSpan() on ended %s %o', this.className,
          this.className, {id: this.id, name: this.name, kind: this.kind});
      return null;
    }
    if (!this.started) {
      this.logger.debug(
          'calling %s.startSpan() on un-started %s %o', this.className,
          this.className, {id: this.id, name: this.name, kind: this.kind});
      return null;
    }
    const newSpan = new Span(this);
    if (name) {
      newSpan.name = name;
    }
    if (kind) {
      newSpan.kind = kind;
    }
    newSpan.start();
    this.spansLocal.push(newSpan);
    return newSpan;
  }
}
