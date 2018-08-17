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

import {isValidOption, isValidSpanId, isValidTraceId, isValidVersion} from './validators';

// Header names
const TRACE_PARENT = 'traceparent';
const TRACE_STATE = 'tracestate';

// Option flags
const REQUESTED_FLAG = 0x1;
const RECORDED_FLAG = 0x2;

const DEFAULT_OPTIONS = REQUESTED_FLAG;

/**
 * Propagates span context through Trace Context format propagation.
 *
 * Based on the Trace Context specification:
 * https://w3c.github.io/distributed-tracing/report-trace-context.html
 *
 * Known Limitations:
 * - Multiple `tracestate` headers are merged into a single `tracestate`
 *   during injection. This might exceed the 512 character rule as defined
 *   in section 2.3.2.
 */
export class TraceContextFormat implements Propagation {
  /**
   * Gets the trace context from a request headers. If there is no trace context
   * in the headers, or if the parsed `traceId` or `spanId` is invalid, an empty
   * context is returned.
   * @param getter
   */
  extract(getter: HeaderGetter): SpanContext {
    if (getter) {
      // Construct empty span context that we will fill
      const spanContext: SpanContext = {
        traceId: undefined,
        spanId: undefined,
        options: DEFAULT_OPTIONS,
        traceState: undefined
      };

      let traceState = getter.getHeader(TRACE_STATE);
      if (Array.isArray(traceState)) {
        // If more than one `tracestate` header is found, we merge them into a
        // single header.
        traceState = traceState.join(',');
      }
      spanContext.traceState = typeof traceState === 'string' ?
          traceState :
          undefined;

      // Read headers
      let traceParent = getter.getHeader(TRACE_PARENT);
      if (Array.isArray(traceParent)) {
        traceParent = traceParent[0];
      }

      // Parse TraceParent into version, traceId, spanId, and option flags. All
      // parts of the header should be present or it is considered invalid.
      const parts = traceParent ? traceParent.split('-') : [];
      if (parts.length === 4) {
        // Both traceId and spanId must be of valid form for the traceparent
        // header to be accepted. If either is not valid we simply return the
        // empty spanContext.
        const version = parts[0];
        const traceId = parts[1];
        const spanId = parts[2];
        if (!isValidVersion(version) || !isValidTraceId(traceId) ||
            !isValidSpanId(spanId)) {
          return spanContext;
        }
        spanContext.traceId = traceId;
        spanContext.spanId = spanId;

        // Validate options. If the options are invalid we simply reset them to
        // default.
        let optionsHex = parts[3];
        if (!isValidOption(optionsHex)) {
          optionsHex = DEFAULT_OPTIONS.toString(16);
        }
        const options = Number('0x' + optionsHex);
        spanContext.options = options;
      }

      return spanContext;
    }
    return null;
  }

  /**
   * Adds a trace context in a request headers.
   * @param setter
   * @param spanContext
   */
  inject(setter: HeaderSetter, spanContext: SpanContext): void {
    if (setter && spanContext) {
      // Construct traceparent from parts. Make sure the traceId and spanId
      // contain the proper number of characters.
      const optionsHex = Buffer.from([spanContext.options]).toString('hex');
      const traceIdHex =
          ('00000000000000000000000000000000' + spanContext.traceId).slice(-32);
      const spanIdHex = ('0000000000000000' + spanContext.spanId).slice(-16);
      const traceParent = `00-${traceIdHex}-${spanIdHex}-${optionsHex}`;

      setter.setHeader(TRACE_PARENT, traceParent);
      if (spanContext.traceState) {
        setter.setHeader(TRACE_STATE, spanContext.traceState);
      }
    }
  }

  /**
   * Generate SpanContext.
   *
   * Context parts are based on section 2.2.2 of TraceContext spec.
   */
  generate(): SpanContext {
    return {
      traceId: crypto.randomBytes(16).toString('hex'),
      spanId: crypto.randomBytes(8).toString('hex'),
      options: DEFAULT_OPTIONS,
      traceState: undefined
    };
  }
}
