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

import {HeaderGetter, HeaderSetter, Propagation, SpanContext} from '@opencensus/core';
import * as crypto from 'crypto';
import * as uuid from 'uuid';
import {isValidSpanId, isValidTraceId} from './validators';

// TRACER_STATE_HEADER_NAME is the header key used for a span's serialized
// context.
export const TRACER_STATE_HEADER_NAME = 'uber-trace-id';

// JAEGER_DEBUG_HEADER is the name of an HTTP header or a TextMap carrier key
// which, if found in the carrier, forces the trace to be sampled as "debug"
// trace.
const JAEGER_DEBUG_HEADER = 'jaeger-debug-id';

const DEBUG_VALUE = 2;
export const SAMPLED_VALUE = 1;

/**
 * Propagates span context through Jaeger trace-id propagation.
 *  The format of the header is described in the jaeger documentation:
 *  (https://www.jaegertracing.io/docs/client-libraries/)
 */
export class JaegerFormat implements Propagation {
  /**
   * Gets the trace context from a request headers. If there is no trace context
   * in the headers, null is returned.
   * @param getter
   */
  extract(getter: HeaderGetter): SpanContext|null {
    const debugId = this.parseHeader(getter.getHeader(JAEGER_DEBUG_HEADER));
    const tracerStateHeader =
        this.parseHeader(getter.getHeader(TRACER_STATE_HEADER_NAME));

    if (!tracerStateHeader) return null;
    const tracerStateHeaderParts = tracerStateHeader.split(':');
    if (tracerStateHeaderParts.length !== 4) return null;

    const traceId = tracerStateHeaderParts[0];
    const spanId = tracerStateHeaderParts[1];
    const jflags = Number('0x' + tracerStateHeaderParts[3]);
    const sampled = jflags & SAMPLED_VALUE;
    const debug = (jflags & DEBUG_VALUE) || (debugId ? SAMPLED_VALUE : 0);
    const options = (sampled || debug) ? SAMPLED_VALUE : 0;

    return {traceId, spanId, options};
  }

  /**
   * Adds a trace context in a request headers.
   * @param setter
   * @param spanContext
   */
  inject(setter: HeaderSetter, spanContext: SpanContext): void {
    if (!spanContext || !isValidTraceId(spanContext.traceId) ||
        !isValidSpanId(spanContext.spanId)) {
      return;
    }

    let flags = '0';
    if (spanContext.options) {
      flags = ((spanContext.options & SAMPLED_VALUE) ? SAMPLED_VALUE : 0)
                  .toString(16);
    }

    // {parent-span-id} Deprecated, most Jaeger clients ignore on the receiving
    // side, but still include it on the sending side.
    const header = [
      spanContext.traceId, spanContext.spanId, /** parent-span-id */ '', flags
    ].join(':');
    setter.setHeader(TRACER_STATE_HEADER_NAME, header);
  }

  /**
   * Generate SpanContexts
   */
  generate(): SpanContext {
    return {
      traceId: uuid.v4().split('-').join(''),
      spanId: crypto.randomBytes(8).toString('hex'),
      options: SAMPLED_VALUE
    };
  }

  /** Converts a headers type to a string. */
  private parseHeader(str: string|string[]|undefined): string|undefined {
    if (Array.isArray(str)) {
      return str[0];
    }
    return str;
  }
}
