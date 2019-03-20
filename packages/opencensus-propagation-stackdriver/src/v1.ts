/**
 * Copyright 2015 Google Inc. All Rights Reserved.
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
 * Full details at https://cloud.google.com/trace/docs/support.
 */

import * as crypto from 'crypto';
import {decToHex, hexToDec} from 'hex2dec';
import * as uuid from 'uuid';
import {HeaderGetter, HeaderSetter, SpanContext} from './index';

const TRACE_CONTEXT_HEADER_NAME = 'x-cloud-trace-context';

export function parseContextFromHeader(str: string|string[]|
                                       undefined): SpanContext|null {
  if (typeof str !== 'string') {
    return null;
  }
  const matches = str.match(/^([0-9a-fA-F]+)(?:\/([0-9]+))(?:;o=(.*))?/);
  if (!matches || matches.length !== 4 || matches[0] !== str ||
      (matches[2] && isNaN(Number(matches[2])))) {
    return null;
  }
  return {
    traceId: matches[1],
    // strip 0x prefix from hex output from decToHex, and and pad so it's always
    // a length-16 hex string
    spanId: `0000000000000000${decToHex(matches[2]).slice(2)}`.slice(-16),
    options: isNaN(Number(matches[3])) ? undefined : Number(matches[3])
  };
}

export function serializeSpanContext(spanContext: SpanContext) {
  let header = `${spanContext.traceId}/${hexToDec(spanContext.spanId)}`;
  if (spanContext.options) {
    header += `;o=${spanContext.options}`;
  }
  return header;
}

export function extract(getter: HeaderGetter) {
  return parseContextFromHeader(getter.getHeader(TRACE_CONTEXT_HEADER_NAME));
}

export function inject(setter: HeaderSetter, spanContext: SpanContext) {
  setter.setHeader(
      TRACE_CONTEXT_HEADER_NAME, serializeSpanContext(spanContext));
}

const SPAN_ID_RANDOM_BYTES = 8;

// Use the faster crypto.randomFillSync when available (Node 7+) falling back to
// using crypto.randomBytes.
// TODO(ofrobots): Use alternate logic for the browser where crypto and Buffer
//    are not available.
const spanIdBuffer = Buffer.alloc(SPAN_ID_RANDOM_BYTES);
const randomFillSync = crypto.randomFillSync;
const randomBytes = crypto.randomBytes;
const spanRandomBuffer = randomFillSync ?
    () => randomFillSync(spanIdBuffer) :
    () => randomBytes(SPAN_ID_RANDOM_BYTES);

export function generate(): SpanContext {
  return {
    traceId: uuid.v4().split('-').join(''),
    spanId: spanRandomBuffer().toString('hex')
  };
}
