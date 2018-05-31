/**
 * Copyright 2018, OpenCensus Authors *
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
import * as path from 'path';

const indexPath = path.dirname(require.resolve('jaeger-client'));

function requireJaegerClientModule(nodeName: string) {
  return require(path.join(indexPath, nodeName)).default;
}

// tslint:disable-next-line:variable-name
export const UDPSender = requireJaegerClientModule('reporters/udp_sender');
// tslint:disable-next-line:variable-name
export const Utils = requireJaegerClientModule('util');
// tslint:disable-next-line:variable-name
export const ThriftUtils = requireJaegerClientModule('thrift');

export type Tag = {
  key: string,
  // tslint:disable-next-line:no-any
  value: any
};

export type Process = {
  serviceName: string,
  tags: Tag[]
};

export type SenderCallback = (numSpans: number, err?: string) => void;

/**
 * Translate opencensus Span to Jeager Thrift Span
 * @param span
 */
export function spanToThrift(span: types.Span) {
  let spanTags = [];
  if (span.attributes) {
    const tags = [];
    Object.keys(span.attributes).forEach(key => {
      tags.push({'key': key, 'value': span.attributes[key]});
    });
    spanTags = ThriftUtils.getThriftTags(tags);
  }

  const spanLogs = [];
  const unsigned = true;
  const length = span.spanContext.traceId.length;

  return {
    traceIdLow: Utils.encodeInt64(span.spanContext.traceId),
    traceIdHigh: ThriftUtils.emptyBuffer,
    spanId: Utils.encodeInt64(span.spanContext.spanId),
    parentSpanId: span.parentSpanId || ThriftUtils.emptyBuffer,
    operationName: span.name,
    references: [],
    flags: span.spanContext.options || 0x1,
    startTime:
        Utils.encodeInt64(span.startTime.getTime() * 1000),  // to microseconds
    duration: Utils.encodeInt64(span.duration * 1000),       // to microseconds
    tags: spanTags,
    logs: spanLogs,
  };
}
