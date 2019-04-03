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

import {Annotation, Attributes, Link, LinkType, MessageEvent, MessageEventType, RootSpan, Span, SpanKind} from '@opencensus/core';
import {google, opencensus} from './types';

/**
 * Adapts a string to a `opencensus.proto.trace.v1.TruncatableString` type.
 * @param value string
 * @returns opencensus.proto.trace.v1.TruncatableString
 */
const stringToTruncatableString =
    (value: string): opencensus.proto.trace.v1.TruncatableString => {
      return {value, truncatedByteCount: null};
    };

/**
 * Adapts a millis number or Date object to a `google.protobuf.Timestamp` type.
 * @param millis Date | number
 * @returns google.protobuf.Timestamp
 */
const millisToTimestamp = (millis: Date|number): google.protobuf.Timestamp => {
  let milliseconds = 0;
  if (typeof millis === 'number') {
    milliseconds = millis;
  } else {
    milliseconds = millis.getTime();
  }

  const seconds = Math.floor(milliseconds / 1000);
  const nanos = (milliseconds % 1000) * 1000000;

  return {seconds, nanos};
};

/**
 * Adapts a hex string to a `Uint8Array` type. Takes two characters (one byte)
 * at a time.
 * @param hex string
 * @returns Uint8Array
 */
const hexStringToUint8Array = (hex: string): Uint8Array|null => {
  if (!hex) return null;
  const match = hex.match(/.{1,2}/g);
  if (!match) return null;
  // tslint:disable-next-line:ban Needed to parse hexadecimal.
  return new Uint8Array(match.map(byte => parseInt(byte, 16)));
};

/**
 * Adapts a string spanKind value to a `opencensus.proto.trace.v1.Span.SpanKind`
 * enum type.
 */
const spanKindToEnum =
    (kind: SpanKind): opencensus.proto.trace.v1.Span.SpanKind => {
      switch (kind) {
        case SpanKind.SERVER: {
          return opencensus.proto.trace.v1.Span.SpanKind.SERVER;
        }
        case SpanKind.CLIENT: {
          return opencensus.proto.trace.v1.Span.SpanKind.CLIENT;
        }
        default: {
          return opencensus.proto.trace.v1.Span.SpanKind.SPAN_KIND_UNSPECIFIED;
        }
      }
    };

/**
 * Adapts Attributes to a `opencensus.proto.trace.v1.Span.Attributes` type.
 * @param attributes Attributes
 * @returns opencensus.proto.trace.v1.Span.Attributes
 */
const adaptAttributes = (attributes: Attributes,
                         droppedAttributesCount: number):
                            opencensus.proto.trace.v1.Span.Attributes|null => {
  if (!attributes) {
    return null;
  }

  const attributeMap:
      Record<string, opencensus.proto.trace.v1.AttributeValue> = {};

  Object.getOwnPropertyNames(attributes).forEach((name) => {
    const value = attributes[name];

    let stringValue: opencensus.proto.trace.v1.TruncatableString|null = null;
    let intValue: number|null = null;
    let boolValue: boolean|null = null;

    switch (typeof value) {
      case 'number': {
        intValue = value as number;
        break;
      }
      case 'boolean': {
        boolValue = value as boolean;
        break;
      }
      case 'string': {
        stringValue = {value: value as string, truncatedByteCount: null};
        break;
      }
      default: {
        // Unsupported type
      }
    }

    attributeMap[name] = {stringValue, intValue, boolValue};
  });

  return {attributeMap, droppedAttributesCount};
};

/**
 * Adapts a string messageType value to a
 * `opencensus.proto.trace.v1.Span.TimeEvent.MessageEvent.Type` enum type.
 * @param value
 * @return opencensus.proto.trace.v1.Span.TimeEvent.MessageEvent.Type
 */
const adaptMessageEventType = (type: MessageEventType): opencensus.proto.trace
                                  .v1.Span.TimeEvent.MessageEvent.Type => {
  switch (type) {
    case MessageEventType.SENT: {
      return opencensus.proto.trace.v1.Span.TimeEvent.MessageEvent.Type.SENT;
    }
    case MessageEventType.RECEIVED: {
      return opencensus.proto.trace.v1.Span.TimeEvent.MessageEvent.Type
          .RECEIVED;
    }
    default: {
      return opencensus.proto.trace.v1.Span.TimeEvent.MessageEvent.Type
          .TYPE_UNSPECIFIED;
    }
  }
};

/**
 * Adapters the given annotations and messageEvents to timeEvents. Annotations
 * are events with no time but containing a description and attributes, whereas
 * MessageEvents are events with a time and type, but no attributes.
 * @param annotations Annotation[]
 * @param messageEvents MessageEvent[]
 * @returns opencensus.proto.trace.v1.Span.TimeEvents
 */
const adaptTimeEvents =
    (annotations: Annotation[], messageEvents: MessageEvent[],
     droppedAnnotationsCount: number, droppedMessageEventsCount: number):
        opencensus.proto.trace.v1.Span.TimeEvents => {
      const timeEvents: opencensus.proto.trace.v1.Span.TimeEvent[] = [];

      if (annotations) {
        annotations.forEach(annotation => {
          timeEvents.push({
            time: null,
            annotation: {
              description: stringToTruncatableString(annotation.description),
              attributes: adaptAttributes(annotation.attributes, 0)
            }
          });
        });
      }

      if (messageEvents) {
        messageEvents.forEach(messageEvent => {
          timeEvents.push({
            time: millisToTimestamp(messageEvent.timestamp),
            messageEvent: {
              id: messageEvent.id,
              type: adaptMessageEventType(messageEvent.type),
              uncompressedSize: messageEvent.uncompressedSize || 0,
              compressedSize: messageEvent.compressedSize || 0
            }
          });
        });
      }

      return {
        timeEvent: timeEvents,
        droppedAnnotationsCount,
        droppedMessageEventsCount
      };
    };

/**
 * Adapts a traceState string to a `opencensus.proto.trace.v1.Span.Tracestate`
 * type. The tracestate is a comma-delimited set of equals-delimited key-value
 * pairs.
 * @param traceState string
 * @returns opencensus.proto.trace.v1.Span.Tracestate
 */
const adaptTraceState =
    (traceState?: string): opencensus.proto.trace.v1.Span.Tracestate => {
      const entries: opencensus.proto.trace.v1.Span.Tracestate.Entry[]|null =
          !traceState ? null : traceState.split(',').map(state => {
            const [key, value] = state.split('=');
            return {key, value};
          });

      return {entries};
    };

/**
 * Adapts a link to a `opencensus.proto.trace.v1.Span.Link` type.
 * @param link Link
 * @returns opencensus.proto.trace.v1.Span.Link
 */
const adaptLink = (link: Link): opencensus.proto.trace.v1.Span.Link => {
  const traceId = hexStringToUint8Array(link.traceId);
  const spanId = hexStringToUint8Array(link.spanId);

  let type;
  switch (link.type) {
    case LinkType.CHILD_LINKED_SPAN: {
      type = opencensus.proto.trace.v1.Span.Link.Type.CHILD_LINKED_SPAN;
      break;
    }
    case LinkType.PARENT_LINKED_SPAN: {
      type = opencensus.proto.trace.v1.Span.Link.Type.PARENT_LINKED_SPAN;
      break;
    }
    default: {
      type = opencensus.proto.trace.v1.Span.Link.Type.TYPE_UNSPECIFIED;
    }
  }

  const attributes = adaptAttributes(link.attributes, 0);

  return {traceId, spanId, type, attributes};
};

/**
 * Adapts a set of links to a `opencensus.proto.trace.v1.Span.Links` type.
 * @param links Link[]
 * @returns opencensus.proto.trace.v1.Span.Links
 */
const adaptLinks = (links: Link[] = [], droppedLinksCount: number):
                       opencensus.proto.trace.v1.Span.Links => {
  return {link: links.map(adaptLink), droppedLinksCount};
};

/**
 * Adapts a boolean to a `google.protobuf.BoolValue` type.
 * @param value boolean
 * @returns google.protobuf.BoolValue
 */
const adaptBoolean = (value: boolean): google.protobuf.BoolValue => ({value});

/**
 * Adapts a span to a `opencensus.proto.trace.v1.Span` type.
 * @param span Span
 * @returns opencensus.proto.trace.v1.Span
 */
export const adaptSpan = (span: Span): opencensus.proto.trace.v1.Span => {
  return {
    traceId: hexStringToUint8Array(span.traceId),
    spanId: hexStringToUint8Array(span.id),
    tracestate: adaptTraceState(span.traceState),
    parentSpanId: hexStringToUint8Array(span.parentSpanId),
    name: stringToTruncatableString(span.name),
    kind: spanKindToEnum(span.kind),
    startTime: millisToTimestamp(span.startTime),
    endTime: millisToTimestamp(span.endTime),
    attributes: adaptAttributes(span.attributes, span.droppedAttributesCount),
    stackTrace: null,  // Unsupported by nodejs
    timeEvents: adaptTimeEvents(
        span.annotations, span.messageEvents, span.droppedAnnotationsCount,
        span.droppedMessageEventsCount),
    links: adaptLinks(span.links, span.droppedLinksCount),
    status: span.status,
    sameProcessAsParentSpan: adaptBoolean(!span.remoteParent),
    childSpanCount: null,
  };
};

/**
 * Adapts a RootSpan and all its associated child spans into a flat list of
 * adapted `opencensus.proto.trace.v1.Span` types.
 * @param rootSpan RootSpan
 * @returns opencensus.proto.trace.v1.Span[]
 */
export const adaptRootSpan =
    (rootSpan: RootSpan): opencensus.proto.trace.v1.Span[] => {
      return [adaptSpan(rootSpan), ...rootSpan.spans.map(adaptSpan)];
    };

/**
 * Options for creating a `opencensus.proto.agent.common.v1.Node` type.
 */
export interface CreateNodeOptions {
  serviceName: string;
  exporterVersion: string;
  coreVersion: string;
  hostName: string;
  processStartTimeMillis: number;
  attributes: Record<string, string>|undefined;
}

/**
 * Creates a `opencensus.proto.agent.common.v1.Node` type from the given
 * options.
 * @param options CreateNodeOptions
 * @returns opencensus.proto.agent.common.v1.Node
 */
export const createNode = (options: CreateNodeOptions):
                              opencensus.proto.agent.common.v1.Node => {
  return {
    identifier: {
      hostName: options.hostName,
      pid: process.pid,
      startTimestamp: millisToTimestamp(options.processStartTimeMillis)
    },
    libraryInfo: {
      language: opencensus.proto.agent.common.v1.LibraryInfo.Language.NODE_JS,
      exporterVersion: options.exporterVersion,
      coreLibraryVersion: options.coreVersion
    },
    serviceInfo: {name: options.serviceName},
    attributes: options.attributes
  };
};
