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

const TRACE_ID_HEADER = 'uber-trace-id';
const DEBUG_ID_HEADER = 'jaeger-debug-id';

const DEBUG_VALUE = 2;
const SAMPLED_VALUE = 1;

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
    if (getter) {
      let debug = 0;
      if (getter.getHeader(DEBUG_ID_HEADER)) {
        debug = SAMPLED_VALUE;
      }

      const spanContext = {traceId: '', spanId: '', options: debug};

      let header = getter.getHeader(TRACE_ID_HEADER);
      if (!header) {
        return spanContext;
      }
      if (header instanceof Array) {
        header = header[0];
      }
      const parts = header.split(':');
      if (parts.length !== 4) {
        return spanContext;
      }

      spanContext.traceId = parts[0];
      spanContext.spanId = parts[1];

      const jflags = Number('0x' + parts[3]);
      const sampled = jflags & SAMPLED_VALUE;

      debug = (jflags & DEBUG_VALUE) || debug;

      spanContext.options = (sampled || debug) ? SAMPLED_VALUE : 0;

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
    if (setter) {
      let flags = '0';
      if (spanContext.options) {
        flags = (spanContext.options & SAMPLED_VALUE ? SAMPLED_VALUE : 0)
                    .toString(16);
      }

      const header =
          [spanContext.traceId, spanContext.spanId, '', flags].join(':');
      setter.setHeader(TRACE_ID_HEADER, header);
    }
  }

  /**
   * Generate SpanContexts
   */
  generate(): SpanContext {
    return {
      traceId: uuid.v4().split('-').join(''),
      // tslint:disable-next-line:ban Needed to parse hexadecimal.
      spanId: parseInt(crypto.randomBytes(6).toString('hex'), 16).toString(),
      options: SAMPLED_VALUE
    } as SpanContext;
  }
}
