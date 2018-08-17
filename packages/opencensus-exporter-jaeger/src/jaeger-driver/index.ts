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

import {Span} from '@opencensus/core';
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

export type TagValue = string|number|boolean;

export type Tag = {
  key: string,
  value: TagValue
};

export type Log = {
  timestamp: number,
  fields: Tag[]
};

export type SenderCallback = (numSpans: number, err?: string) => void;

export type ThriftProcess = {
  serviceName: string,
  tags: ThriftTag[]
};

export type ThriftTag = {
  key: string,
  vType: string,
  vStr: string,
  vDouble: number,
  vBool: boolean
};

export type ThriftLog = {
  timestamp: number,
  fields: ThriftTag[]
};

export enum ThriftReferenceType {
  CHILD_OF = 'CHILD_OF',
  FOLLOWS_FROM = 'FOLLOWS_FROM'
}

export type ThriftReference = {
  traceIdLow: Buffer,
  traceIdHigh: Buffer,
  spanId: Buffer,
  refType: ThriftReferenceType
};

export type ThriftSpan = {
  traceIdLow: Buffer,
  traceIdHigh: Buffer,
  spanId: Buffer,
  parentSpanId: string|Buffer,
  operationName: string,
  references: ThriftReference[],
  flags: number,
  startTime: number,  // milliseconds
  duration: number,   // milliseconds
  tags: ThriftTag[],
  logs: ThriftLog[],
};

/**
 * Translate opencensus Span to Jeager Thrift Span
 * @param span
 */
export function spanToThrift(span: Span): ThriftSpan {
  const tags: Tag[] = [];
  if (span.attributes) {
    Object.keys(span.attributes).forEach(key => {
      tags.push({'key': key, 'value': span.attributes[key]});
    });
  }

  const logs: Log[] = [];
  if (span.messageEvents) {
    span.messageEvents.forEach(msg => {
      logs.push({
        timestamp: msg.timestamp,
        fields: [
          {'key': 'message.id', 'value': msg.id},
          {'key': 'message.type', 'value': msg.type}
        ],
      });
    });
  }

  if (span.annotations) {
    span.annotations.forEach(ann => {
      const tags: Tag[] = [];
      Object.keys(ann.attributes).forEach(key => {
        tags.push({'key': key, 'value': ann.attributes[key]});
      });
      tags.push({'key': 'description', 'value': ann.description});
      logs.push({
        timestamp: ann.timestamp,
        fields: tags,
      });
    });
  }

  const unsigned = true;
  const parentSpan: string|Buffer = span.parentSpanId ?
      Utils.encodeInt64(span.parentSpanId) :
      ThriftUtils.emptyBuffer;

  const traceId =
      `00000000000000000000000000000000${span.spanContext.traceId}`.slice(-32);

  const high = traceId.slice(0, 16);
  const low = traceId.slice(16);
  const spanTags: ThriftTag[] = ThriftUtils.getThriftTags(tags);
  const spanLogs: ThriftLog[] = ThriftUtils.getThriftLogs(logs);

  return {
    traceIdLow: Utils.encodeInt64(low),
    traceIdHigh: Utils.encodeInt64(high),
    spanId: Utils.encodeInt64(span.spanContext.spanId),
    parentSpanId: parentSpan,
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
