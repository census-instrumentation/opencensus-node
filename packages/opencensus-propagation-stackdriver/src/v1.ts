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

import crypto from 'crypto';
import uuid from 'uuid';

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
    spanId: matches[2],
    options: isNaN(Number(matches[3])) ? undefined : Number(matches[3])
  };
}

export function serializeSpanContext(spanContext: SpanContext) {
  let header = `${spanContext.traceId}/${spanContext.spanId}`;
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

// Use 6 bytes of randomness only as JS numbers are doubles not 64-bit ints.
const SPAN_ID_RANDOM_BYTES = 6;

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
    // tslint:disable-next-line:ban Needed to parse hexadecimal.
    spanId: parseInt(spanRandomBuffer().toString('hex'), 16).toString()
  };
}
