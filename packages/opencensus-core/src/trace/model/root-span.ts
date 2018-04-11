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
import {OnEndSpanEventListener, SpanBaseModel, TraceContext, TraceOptions} from '../types/tracetypes';
import {Span} from './span';
import {Tracer} from './tracer';

/** Defines a root span */
export class RootSpan extends SpanBaseModel implements OnEndSpanEventListener {
  private tracer: Tracer;
  readonly traceId: string;
  private spansLocal: Span[] = [];

  /**
   * Constructs a new RootSpan instance.
   * @param tracer
   * @param context
   */
  constructor(tracer: Tracer, context?: TraceOptions) {
    super();
    this.tracer = tracer;
    this.traceId =
        context && context.traceContext && context.traceContext.traceId ?
        context.traceContext.traceId :
        (uuid.v4().split('-').join(''));
    // TODO - improve root name setup
    this.name = context && context.name ? context.name : 'undefined';
    if (context && context.traceContext) {
      this.setParentSpanId(context.traceContext.spanId || '');
    }
  }

  /** Returns a list of the trace's spans. */
  get spans() {
    return this.spansLocal;
  }

  /** Starts the root span. */
  start() {
    super.start();
    debug('starting %s  %o', this._className, {
      traceId: this.traceId,
      id: this.id,
      parentSpanId: this.getParentSpanId()
    });
  }

  /** Ends the root span. */
  end() {
    super.end();

    // TODO - Define logic for list of spans
    this.spansLocal.map(span => {
      if (span.ended || !span.started) return;
      span.truncate();
    });

    debug('ending %s  %o', this._className, {
      id: this.id,
      traceId: this.traceId,
      name: this.name,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration
    });

    this.tracer.onEndSpan(this);
  }

  /**
   * Happens when a span is ended.
   * @param span
   */
  onEndSpan(span: Span) {
    debug('%s notified ending by %o', {id: span.id, name: span.name});
  }

  /**
   * Starts a span inside the respective trace.
   * @param name Span's name
   * @param type Spans's type
   * @param parentSpanId Span's parent ID
   */
  startSpan(name: string, type: string, parentSpanId?: string) {
    if (!this.started) {
      debug(
          'calling %s.startSpan() on un-started %s %o', this._className,
          this._className, {id: this.id, name: this.name, type: this.type});
      return;
    }
    if (this.ended) {
      debug(
          'calling %s.startSpan() on ended %s %o', this._className,
          this._className, {id: this.id, name: this.name, type: this.type});
      return;
    }
    const newSpan = new Span(this);
    if (name) {
      newSpan.name = name;
    }
    if (type) {
      newSpan.type = type;
    }
    if (type) {
      newSpan.setParentSpanId(parentSpanId || '');
    }
    newSpan.start();
    this.spansLocal.push(newSpan);
    return newSpan;
  }
}
