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

export const X_B3_TRACE_ID = 'x-b3-traceid';
export const X_B3_SPAN_ID = 'x-b3-spanid';
export const X_B3_PARENT_SPAN_ID = 'x-b3-parentspanid';
export const X_B3_SAMPLED = 'x-b3-sampled';
export const SAMPLED_VALUE = 0x1;
export const NOT_SAMPLED_VALUE = 0x0;

/** Propagates span context through B3 Format propagation. */
export class B3Format implements Propagation {
  /**
   * Gets the trace context from a request headers. If there is no trace context
   * in the headers, null is returned.
   * @param getter
   */
  extract(getter: HeaderGetter): SpanContext|null {
    if (!getter) return null;
    let opt = getter.getHeader(X_B3_SAMPLED);
    if (opt instanceof Array) {
      opt = opt[0];
    }
    return {
      traceId: getter.getHeader(X_B3_TRACE_ID),
      spanId: getter.getHeader(X_B3_SPAN_ID),
      options: isNaN(Number(opt)) ? NOT_SAMPLED_VALUE : Number(opt)
    } as SpanContext;
  }

  /**
   * Adds a trace context in a request headers.
   * @param setter
   * @param spanContext
   */
  inject(setter: HeaderSetter, spanContext: SpanContext): void {
    setter.setHeader(X_B3_TRACE_ID, spanContext.traceId || '');
    setter.setHeader(X_B3_SPAN_ID, spanContext.spanId || '');
    if (spanContext &&
        (spanContext.options || NOT_SAMPLED_VALUE & SAMPLED_VALUE) !== 0) {
      setter.setHeader(X_B3_SAMPLED, `${SAMPLED_VALUE}`);
    } else {
      setter.setHeader(X_B3_SAMPLED, `${NOT_SAMPLED_VALUE}`);
    }
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
}
