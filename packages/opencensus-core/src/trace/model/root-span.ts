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
import { Span } from './span';
import * as types from './types';

/** Defines a root span */
export class RootSpan extends Span {
  /** Its trace ID. */
  private traceIdLocal: string;
  /** Its trace state. */
  private traceStateLocal?: types.TraceState;
  /**
   * This span's parent Id.  This is a string and not a Span because the
   * parent was likely started on another machine.
   */
  private parentSpanIdLocal: string;
  /** A tracer object */
  readonly tracer: types.TracerBase;

  /**
   * Constructs a new RootSpanImpl instance.
   * @param tracer A tracer object.
   * @param name The displayed name for the new span.
   * @param kind The kind of new span.
   * @param traceId The trace Id.
   * @param parentSpanId The id of the parent span, or empty if the new span is
   *     a root span.
   * @param traceState An optional traceState.
   */
  constructor(
    tracer: types.TracerBase,
    name: string,
    kind: types.SpanKind,
    traceId: string,
    parentSpanId: string,
    traceState?: types.TraceState
  ) {
    super(tracer);
    this.tracer = tracer;
    this.traceIdLocal = traceId;
    this.name = name;
    this.kind = kind;
    this.parentSpanIdLocal = parentSpanId;
    if (traceState) {
      this.traceStateLocal = traceState;
    }
    this.logger = tracer.logger || logger.logger();
    this.activeTraceParams = tracer.activeTraceParams;
  }

  /** Returns whether a span is root or not. */
  isRootSpan(): boolean {
    return true;
  }

  /** Gets trace id from rootspan instance. */
  get traceId(): string {
    return this.traceIdLocal;
  }

  /** Gets trace state from rootspan instance */
  get traceState(): types.TraceState | undefined {
    return this.traceStateLocal;
  }

  get parentSpanId(): string {
    return this.parentSpanIdLocal;
  }
}
