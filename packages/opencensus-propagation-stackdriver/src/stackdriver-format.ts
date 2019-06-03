/**
 * Copyright 2019 OpenCensus Authors
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

/**
 * This file implements propagation for the Stackdriver Trace v1 Trace Context
 * format.
 *
 * The header specification is:
 * "X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=TRACE_TRUE"
 * Where:
 *  {TRACE_ID} is a 32-character hexadecimal value representing a 128-bit
 *    number. It should be unique between your requests, unless you
 *    intentionally want to bundle the requests together.
 *  {SPAN_ID} is the decimal representation of the (unsigned) span ID. It
 *    should be 0 for the first span in your trace. For subsequent requests,
 *    set SPAN_ID to the span ID of the parent request.
 *  {TRACE_TRUE} must be 1 to trace request. Specify 0 to not trace the request.
 */

import * as crypto from 'crypto';
import { decToHex, hexToDec } from 'hex2dec';
import * as uuid from 'uuid';
import { HeaderGetter, HeaderSetter, Propagation, SpanContext } from './index';

/** Header that carries span context across Google infrastructure. */
export const TRACE_CONTEXT_HEADER_NAME = 'x-cloud-trace-context';
const SPAN_ID_RANDOM_BYTES = 8;
const TRACE_TRUE = 0x1;

/** Propagates span context through Stackdriver Format propagation. */
export class StackdriverFormat implements Propagation {
  /**
   * Gets the span context from a request headers. If there is no span context
   * in the headers, null is returned.
   * @param getter
   */
  extract(getter: HeaderGetter): SpanContext | null {
    const traceContextHeader = getter.getHeader(TRACE_CONTEXT_HEADER_NAME);
    if (typeof traceContextHeader !== 'string') {
      return null;
    }
    const matches = traceContextHeader.match(
      /^([0-9a-fA-F]+)(?:\/([0-9]+))(?:;o=(.*))?/
    );
    if (
      !matches ||
      matches.length !== 4 ||
      matches[0] !== traceContextHeader ||
      (matches[2] && isNaN(Number(matches[2])))
    ) {
      return null;
    }
    return {
      traceId: matches[1],
      // strip 0x prefix from hex output from decToHex, and and pad so it's
      // always a length-16 hex string
      spanId: `0000000000000000${decToHex(matches[2]).slice(2)}`.slice(-16),
      options: isNaN(Number(matches[3])) ? TRACE_TRUE : Number(matches[3]),
    };
  }

  /**
   * Adds a span context in a request headers.
   * @param setter
   * @param spanContext
   */
  inject(setter: HeaderSetter, spanContext: SpanContext): void {
    let header = `${spanContext.traceId}/${hexToDec(spanContext.spanId)}`;
    if (spanContext.options) {
      header += `;o=${spanContext.options}`;
    }

    setter.setHeader(TRACE_CONTEXT_HEADER_NAME, header);
  }

  /** Generate SpanContexts */
  generate(): SpanContext {
    return {
      traceId: uuid.v4().replace(/-/g, ''),
      spanId: spanRandomBuffer().toString('hex'),
      options: TRACE_TRUE,
    };
  }
}

// Use the faster crypto.randomFillSync when available (Node 7+) falling back to
// using crypto.randomBytes.
// TODO(ofrobots): Use alternate logic for the browser where crypto and Buffer
//    are not available.
const spanIdBuffer = Buffer.alloc(SPAN_ID_RANDOM_BYTES);
const randomFillSync = crypto.randomFillSync;
const randomBytes = crypto.randomBytes;
const spanRandomBuffer = randomFillSync
  ? () => randomFillSync(spanIdBuffer)
  : () => randomBytes(SPAN_ID_RANDOM_BYTES);
