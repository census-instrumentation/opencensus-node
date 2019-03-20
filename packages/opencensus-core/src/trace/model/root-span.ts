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

import * as logger from '../../common/console-logger';
import {Span} from './span';
import {SpanBase} from './span-base';
import * as types from './types';


/** Defines a root span */
export class RootSpan extends SpanBase implements types.RootSpan {
  /** A tracer object */
  private tracer: types.Tracer;
  /** A list of child spans. */
  private spansLocal: types.Span[];
  /** Its trace ID. */
  private traceIdLocal: string;
  /** Its trace state. */
  private traceStateLocal: types.TraceState;
  /** set isRootSpan = true */
  readonly isRootSpan = true;
  /** A number of children. */
  private numberOfChildrenLocal: number;

  /**
   * Constructs a new RootSpanImpl instance.
   * @param tracer A tracer object.
   * @param name The displayed name for the new span.
   * @param kind The kind of new span.
   * @param traceId The trace Id.
   * @param parentSpanId The id of the parent span, or empty if the new span is
   *     a root span.
   * @param traceState Optional traceState.
   */
  constructor(
      tracer: types.Tracer, name: string, kind: types.SpanKind, traceId: string,
      parentSpanId: string, traceState?: types.TraceState) {
    super();
    this.tracer = tracer;
    this.traceIdLocal = traceId;
    this.name = name;
    this.kind = kind;
    this.parentSpanId = parentSpanId;
    if (traceState) {
      this.traceStateLocal = traceState;
    }
    this.spansLocal = [];
    this.logger = tracer.logger || logger.logger();
    this.activeTraceParams = tracer.activeTraceParams;
    this.numberOfChildrenLocal = 0;
  }

  /** Gets span list from rootspan instance. */
  get spans(): types.Span[] {
    return this.spansLocal;
  }

  /** Gets trace id from rootspan instance. */
  get traceId(): string {
    return this.traceIdLocal;
  }

  /** Gets trace state from rootspan instance */
  get traceState(): types.TraceState {
    return this.traceStateLocal;
  }

  /** Gets the number of child span created for this span. */
  get numberOfChildren(): number {
    return this.numberOfChildrenLocal;
  }

  /** Starts a rootspan instance. */
  start() {
    super.start();
    this.logger.debug('starting %s  %o', this.className, {
      traceId: this.traceId,
      id: this.id,
      parentSpanId: this.parentSpanId,
      traceState: this.traceState
    });

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
   * @param nameOrOptions Span name string or SpanOptions object.
   * @param kind Span kind if not using SpanOptions object.
   */
  startChildSpan(
      nameOrOptions?: string|types.SpanOptions,
      kind?: types.SpanKind): types.Span {
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
    this.numberOfChildrenLocal++;

    const child = new Span(this);

    const spanName =
        typeof nameOrOptions === 'object' ? nameOrOptions.name : nameOrOptions;
    const spanKind =
        typeof nameOrOptions === 'object' ? nameOrOptions.kind : kind;
    const spanParentId = typeof nameOrOptions === 'object' ?
        nameOrOptions.parentSpanId :
        undefined;
    if (spanName) {
      child.name = spanName;
    }
    if (spanKind) {
      child.kind = spanKind;
    }
    if (spanParentId) {
      child.parentSpanId = spanParentId;
    }

    child.start();
    this.spansLocal.push(child);
    return child;
  }
}
