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

import {types} from '@opencensus/opencensus-core';
import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';

const X_B3_TRACE_ID = 'x-b3-traceid';
const X_B3_SPAN_ID = 'x-b3-spanid';
const X_B3_PARENT_SPAN_ID = 'x-x3-parentspanid';
const X_B3_SAMPLED = 'x-b3-sampled';

const SAMPLED_VALUE = '1';
const NOT_SAMPLED_VALUE = '0';

/** Propagates span context through B3 Format propagation. */
export class B3Format {
  /**
   * Gets the trace context from a request headers. If there is no trace context
   * in the headers, null is returned.
   * @param headers
   */
  // tslint:disable:no-any
  static extractFromHeader(headers: any): types.SpanContext {
    // tslint:disable-next-line
    if (headers && (headers[X_B3_TRACE_ID] || headers[X_B3_SAMPLED])) {
      const spanContext = {
        traceId: headers[X_B3_TRACE_ID],
        spanId: headers[X_B3_SPAN_ID],
        options: headers[X_B3_SAMPLED] === SAMPLED_VALUE ? 1 : 0
      } as types.SpanContext;

      return spanContext;
    }
    return null;
  }

  /**
   * Adds a trace context in a request headers.
   * @param headers
   * @param span
   */
  // tslint:disable:no-any
  static injectToHeader(headers: any, span: types.Span): any {
    headers = headers || {};

    headers[X_B3_TRACE_ID] = span && span.traceId || 'undefined';
    headers[X_B3_SPAN_ID] = span && span.id || 'undefined';
    headers[X_B3_PARENT_SPAN_ID] = span && span.parentSpanId || 'undefined';
    headers[X_B3_SAMPLED] =
        span && span.started ? SAMPLED_VALUE : NOT_SAMPLED_VALUE;

    return headers;
  }
}