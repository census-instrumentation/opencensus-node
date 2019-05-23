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
import {isValidSpanId, isValidTraceId, isValidVersion} from './validators';

/** The traceparent header key. */
export const TRACE_PARENT = 'traceparent';
/** The tracestate header key. */
export const TRACE_STATE = 'tracestate';
/** The default trace options. This defaults to unsampled. */
export const DEFAULT_OPTIONS = 0x0;
/** Regular expression that represents a valid traceparent header. */
const TRACE_PARENT_REGEX = /^[\da-f]{2}-[\da-f]{32}-[\da-f]{16}-[\da-f]{2}$/;

/**
 * Parses a traceparent header value into a SpanContext object, or null if the
 * traceparent value is invalid.
 */
function traceParentToSpanContext(traceParent: string): SpanContext|null {
  const match = traceParent.match(TRACE_PARENT_REGEX);
  if (!match) return null;
  const parts = traceParent.split('-');
  const [version, traceId, spanId, option] = parts;
  // tslint:disable-next-line:ban Needed to parse hexadecimal.
  const options = parseInt(option, 16);

  if (!isValidVersion(version) || !isValidTraceId(traceId) ||
      !isValidSpanId(spanId)) {
    return null;
  }
  return {traceId, spanId, options};
}

/** Converts a headers type to a string. */
function parseHeader(str: string|string[]|undefined): string|undefined {
  return Array.isArray(str) ? str[0] : str;
}

/**
 * Propagates span context through Trace Context format propagation.
 *
 * Based on the Trace Context specification:
 * https://www.w3.org/TR/trace-context/
 *
 * Known Limitations:
 * - Multiple `tracestate` headers are merged into a single `tracestate`
 *   during injection. This might exceed the 512 character rule as defined
 *   in section 2.3.2.
 */
export class TraceContextFormat implements Propagation {
  /**
   * Gets the trace context from a request headers. If there is no trace context
   * in the headers, or if the parsed `traceId` or `spanId` is invalid, null is
   * returned.
   * @param getter
   */
  extract(getter: HeaderGetter): SpanContext|null {
    const traceParentHeader = getter.getHeader(TRACE_PARENT);
    if (!traceParentHeader) return null;
    const traceParent = parseHeader(traceParentHeader);
    if (!traceParent) return null;

    const spanContext = traceParentToSpanContext(traceParent);
    if (!spanContext) return null;

    const traceStateHeader = getter.getHeader(TRACE_STATE);
    if (traceStateHeader) {
      // If more than one `tracestate` header is found, we merge them into a
      // single header.
      spanContext.traceState = Array.isArray(traceStateHeader) ?
          traceStateHeader.join(',') :
          traceStateHeader;
    }
    return spanContext;
  }

  /**
   * Adds a trace context in a request headers.
   * @param setter
   * @param spanContext
   */
  inject(setter: HeaderSetter, spanContext: SpanContext): void {
    // Construct traceparent from parts. Make sure the traceId and spanId
    // contain the proper number of characters.
    const traceParent = `00-${spanContext.traceId}-${spanContext.spanId}-0${
        (spanContext.options || DEFAULT_OPTIONS).toString(16)}`;

    setter.setHeader(TRACE_PARENT, traceParent);
    if (spanContext.traceState) {
      setter.setHeader(TRACE_STATE, spanContext.traceState);
    }
  }

  /**
   * Generate SpanContext.
   *
   * Context parts are based on section 2.2.2 of TraceContext spec.
   */
  generate(): SpanContext {
    const buff = crypto.randomBytes(24).toString('hex');
    return {
      traceId: buff.slice(0, 32),
      spanId: buff.slice(32, 48),
      options: DEFAULT_OPTIONS
    };
  }
}
