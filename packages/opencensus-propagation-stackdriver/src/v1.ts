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

import {SpanContext} from './index';
import {IncomingMessage, ServerResponse} from 'http';
import * as uuid from 'uuid';
import * as crypto from 'crypto';

const TRACE_CONTEXT_HEADER_NAME = 'x-cloud-trace-context';

function parseContextFromHeader(str: string|string[]|undefined): SpanContext|null {
  if (typeof str !== 'string')
    return null;
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

function serializeSpanContext(spanContext: SpanContext) {
  let header = `${spanContext.traceId}/${spanContext.spanId}`;
  if (spanContext.options) {
    header += `;o=${spanContext.options}`;
  }
  return header;
}

function extract(req: IncomingMessage) {
  return parseContextFromHeader(req.headers[TRACE_CONTEXT_HEADER_NAME]);
}

function inject(res: ServerResponse, spanContext: SpanContext) {
  res.setHeader(TRACE_CONTEXT_HEADER_NAME, serializeSpanContext(spanContext));
}

function generateNewSpanContext() {
 return {
    traceId: uuid.v4().split('-').join(''),
    spanId: parseInt(crypto.randomBytes(6).toString('hex'), 16).toString()
  };
}

export {
  extract, inject, generateNewSpanContext
};