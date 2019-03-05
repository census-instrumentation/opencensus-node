/**
 * Copyright 2019, OpenCensus Authors
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
import * as logger from '../../../common/console-logger';
import * as types from '../types';
import {NoopSpan} from './noop-span';
import {NoopSpanBase} from './noop-span-base';

/** No-Op implementation of the RootSpan */
export class NoopRootSpan extends NoopSpanBase implements types.RootSpan {
  /** A tracer object */
  private tracer: types.Tracer;
  /** Its trace ID. */
  private traceIdLocal: string;
  /** Its trace state. */
  private traceStateLocal: types.TraceState;
  /** set isRootSpan = true */
  readonly isRootSpan = true;

  /**
   * Constructs a new NoopRootSpanImpl instance.
   * @param tracer A tracer object.
   * @param context A trace options object to build the noop root span.
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
      this.traceStateLocal = context.spanContext.traceState;
    }
    this.kind =
        context && context.kind ? context.kind : types.SpanKind.UNSPECIFIED;
    this.logger = this.tracer.logger || logger.logger();
  }

  /** No-op implementation of this method. */
  get spans(): types.Span[] {
    return [];
  }

  /** No-op implementation of this method. */
  get traceId(): string {
    return this.traceIdLocal;
  }

  /** No-op implementation of this method. */
  get traceState(): types.TraceState {
    return this.traceStateLocal;
  }

  /** No-op implementation of this method. */
  get numberOfChildren(): number {
    return 0;
  }

  /** No-op implementation of this method. */
  start() {
    super.start();
  }

  /** No-op implementation of this method. */
  end() {
    super.end();
  }

  /**
   * Starts a new child span in the noop root span.
   * @param name Span name.
   * @param kind Span kind.
   * @param parentSpanId Span parent ID.
   */
  startChildSpan(
      nameOrOptions?: string|types.SpanOptions, kind?: types.SpanKind,
      parentSpanId?: string): types.Span {
    const newSpan = new NoopSpan(this);
    let spanName;
    let spanKind;
    if (typeof nameOrOptions === 'object') {
      spanName = nameOrOptions.name;
      spanKind = nameOrOptions.kind;
    } else {
      spanName = nameOrOptions;
      spanKind = kind;
    }

    if (spanName) {
      newSpan.name = spanName;
    }
    if (spanKind) {
      newSpan.kind = spanKind;
    }
    newSpan.start();
    return newSpan;
  }
}
