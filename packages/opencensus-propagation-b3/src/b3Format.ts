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

import {debug} from '@opencensus/opencensus-core';
import {Span, TraceContext} from '@opencensus/opencensus-core';

const X_B3_TRACE_ID = 'x-b3-traceid';
const X_B3_SPAN_ID = 'x-b3-spanid';
const X_B3_PARENT_SPAN_ID = 'x-x3-parentspanid';
const X_B3_SAMPLED = 'x-b3-sampled';

const SAMPLED_VALUE = '1';

/** Propagates span context through B3 Format propagation. */
export class B3Format {
  /**
   * Gets the trace context from a request headers. If there is no trace context
   * in the headers, null is returned.
   * @param headers
   */
  static extractFromHeader(headers: object): TraceContext {
    if (headers && (headers[X_B3_TRACE_ID] || headers[X_B3_SAMPLED])) {
      const traceContext = {
        traceId: headers[X_B3_TRACE_ID],
        spanId: headers[X_B3_SPAN_ID],
        parentSpanId: headers[X_B3_PARENT_SPAN_ID],
      } as TraceContext;

      if (headers[X_B3_SAMPLED] && headers[X_B3_SAMPLED] === SAMPLED_VALUE) {
        traceContext.sampleDecision = true;
      } else {
        traceContext.sampleDecision = false;
      }

      return traceContext;
    }
    return null;
  }

  /**
   * Adds a trace context in a request headers.
   * @param headers
   * @param span
   */
  static injectToHeader(headers: object, span: Span): object {
    const b3Header = {
      'x-b3-traceid': span && span.traceId || 'undefined',
      'x-b3-spanid': span && span.id || 'undefined',
      'x-x3-parentspanid': span && span.parentSpanId || 'undefined',
    };

    if (span) b3Header['x-b3-sampled'] = SAMPLED_VALUE;

    return Object.assign(headers || {}, b3Header);
  }
}