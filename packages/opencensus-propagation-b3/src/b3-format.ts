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

import {types} from '@opencensus/opencensus-core';
import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';
import * as crypto from 'crypto';
import * as uuid from 'uuid';

import {Tracer} from '../../opencensus-core/build/src/index-classes';

const X_B3_TRACE_ID = 'x-b3-traceid';
const X_B3_SPAN_ID = 'x-b3-spanid';
const X_B3_PARENT_SPAN_ID = 'x-x3-parentspanid';
const X_B3_SAMPLED = 'x-b3-sampled';

const SAMPLED_VALUE = 0x1;
const NOT_SAMPLED_VALUE = 0x0;


/** Propagates span context through B3 Format propagation. */
export class B3Format implements types.Propagation {
  /**
   * Gets the trace context from a request headers. If there is no trace context
   * in the headers, null is returned.
   * @param getter
   */
  extract(getter: types.HeaderGetter): types.SpanContext {
    // TODO: Review this logic, maybe make it more robust.
    // Question: are this logic valid if any of the getHeader operations returns
    // a string[].
    if (getter) {
      const opt = getter.getHeader(X_B3_SAMPLED);
      const spanContext = {
        traceId: getter.getHeader(X_B3_TRACE_ID),
        spanId: getter.getHeader(X_B3_SPAN_ID),
        options: isNaN(Number(opt)) ? undefined : Number(opt)
      } as types.SpanContext;

      return spanContext;
    }
    return null;
  }

  /**
   * Adds a trace context in a request headers.
   * @param setter
   * @param spanContext
   */
  inject(setter: types.HeaderSetter, spanContext: types.SpanContext): void {
    if (setter) {
      setter.setHeader(
          X_B3_TRACE_ID, spanContext && spanContext.traceId || 'undefined');
      setter.setHeader(
          X_B3_SPAN_ID, spanContext && spanContext.spanId || 'undefined');
      if (spanContext && (spanContext.options & SAMPLED_VALUE) !== 0) {
        setter.setHeader(X_B3_SAMPLED, `${SAMPLED_VALUE}`);
      } else {
        setter.setHeader(X_B3_SAMPLED, `${NOT_SAMPLED_VALUE}`);
      }
    }
  }

  /**
   * Generate SpanContexts
   */
  generate(): types.SpanContext {
    return {
      traceId: uuid.v4().split('-').join(''),
      // tslint:disable-next-line:ban Needed to parse hexadecimal.
      spanId: parseInt(crypto.randomBytes(6).toString('hex'), 16).toString(),
      options: SAMPLED_VALUE
    } as types.SpanContext;
  }
}
