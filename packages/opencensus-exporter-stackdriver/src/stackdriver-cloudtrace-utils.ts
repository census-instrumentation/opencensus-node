/**
 * Copyright 2019, OpenCensus Authors
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

import * as coreTypes from '@opencensus/core';
import * as types from './types';

const AGENT_LABEL_KEY = 'g.co/agent';
const AGENT_LABEL_VALUE_STRING = `opencensus-node [${coreTypes.version}]`;
const AGENT_LABEL_VALUE = createAttributeValue(AGENT_LABEL_VALUE_STRING);

const HTTP_ATTRIBUTE_MAPPING: { [key: string]: string } = {
  'http.host': '/http/host',
  'http.method': '/http/method',
  'http.path': '/http/path',
  'http.route': '/http/route',
  'http.user_agent': '/http/user_agent',
  'http.status_code': '/http/status_code',
  'http.url': '/http/url',
};

/**
 * Creates StackDriver Links from OpenCensus Link.
 * @param links coreTypes.Link[]
 * @param droppedLinksCount number
 * @returns types.Links
 */
export function createLinks(
  links: coreTypes.Link[],
  droppedLinksCount: number
): types.Links {
  return { link: links.map(link => createLink(link)), droppedLinksCount };
}

/**
 * Creates StackDriver Attributes from OpenCensus Attributes.
 * @param attributes coreTypes.Attributes
 * @param resourceLabels Record<string, types.AttributeValue>
 * @param droppedAttributesCount number
 * @returns types.Attributes
 */
export function createAttributes(
  attributes: coreTypes.Attributes,
  resourceLabels: Record<string, types.AttributeValue>,
  droppedAttributesCount: number
): types.Attributes {
  const attributesBuilder = createAttributesBuilder(
    attributes,
    droppedAttributesCount
  );
  if (attributesBuilder.attributeMap) {
    attributesBuilder.attributeMap[AGENT_LABEL_KEY] = AGENT_LABEL_VALUE;
  }
  attributesBuilder.attributeMap = Object.assign(
    {},
    attributesBuilder.attributeMap,
    resourceLabels
  );
  return attributesBuilder;
}

/**
 * Creates StackDriver TimeEvents from OpenCensus Annotation and MessageEvent.
 * @param annotationTimedEvents coreTypes.Annotation[]
 * @param messageEventTimedEvents coreTypes.MessageEvent[]
 * @param droppedAnnotationsCount number
 * @param droppedMessageEventsCount number
 * @returns types.TimeEvents
 */
export function createTimeEvents(
  annotationTimedEvents: coreTypes.Annotation[],
  messageEventTimedEvents: coreTypes.MessageEvent[],
  droppedAnnotationsCount: number,
  droppedMessageEventsCount: number
): types.TimeEvents {
  let timeEvents: types.TimeEvent[] = [];
  if (annotationTimedEvents) {
    timeEvents = annotationTimedEvents.map(annotation => ({
      time: new Date(annotation.timestamp).toISOString(),
      annotation: {
        description: stringToTruncatableString(annotation.description),
        attributes: createAttributesBuilder(annotation.attributes, 0),
      },
    }));
  }
  if (messageEventTimedEvents) {
    timeEvents.push(
      ...messageEventTimedEvents.map(messageEvent => ({
        time: new Date(messageEvent.timestamp).toISOString(),
        messageEvent: {
          id: String(messageEvent.id),
          type: createMessageEventType(messageEvent.type),
          uncompressedSizeBytes: String(messageEvent.uncompressedSize || 0),
          compressedSizeBytes: String(messageEvent.compressedSize || 0),
        },
      }))
    );
  }
  return {
    timeEvent: timeEvents,
    droppedAnnotationsCount,
    droppedMessageEventsCount,
  };
}

export function stringToTruncatableString(
  value: string
): types.TruncatableString {
  return { value };
}

export async function getResourceLabels(
  monitoredResource: Promise<types.MonitoredResource>
) {
  const resource = await monitoredResource;
  const resourceLabels: Record<string, types.AttributeValue> = {};
  if (resource.type === 'global') {
    return resourceLabels;
  }
  for (const key of Object.keys(resource.labels)) {
    const resourceLabel = `g.co/r/${resource.type}/${key}`;
    resourceLabels[resourceLabel] = createAttributeValue(resource.labels[key]);
  }
  return resourceLabels;
}

function createAttributesBuilder(
  attributes: coreTypes.Attributes,
  droppedAttributesCount: number
): types.Attributes {
  const attributeMap: Record<string, types.AttributeValue> = {};
  for (const key of Object.keys(attributes)) {
    const mapKey = HTTP_ATTRIBUTE_MAPPING[key] || key;
    attributeMap[mapKey] = createAttributeValue(attributes[key]);
  }
  return { attributeMap, droppedAttributesCount };
}

function createLink(link: coreTypes.Link): types.Link {
  const traceId = link.traceId;
  const spanId = link.spanId;
  const type = createLinkType(link.type);
  const attributes = createAttributesBuilder(link.attributes, 0);
  return { traceId, spanId, type, attributes };
}

function createAttributeValue(
  value: string | number | boolean
): types.AttributeValue {
  switch (typeof value) {
    case 'number':
      // TODO: Consider to change to doubleValue when available in V2 API.
      return { intValue: String(value) };
    case 'boolean':
      return { boolValue: value as boolean };
    case 'string':
      return { stringValue: stringToTruncatableString(value) };
    default:
      throw new Error(`Unsupported type : ${typeof value}`);
  }
}

function createMessageEventType(type: coreTypes.MessageEventType) {
  switch (type) {
    case coreTypes.MessageEventType.SENT: {
      return types.Type.SENT;
    }
    case coreTypes.MessageEventType.RECEIVED: {
      return types.Type.RECEIVED;
    }
    default: {
      return types.Type.TYPE_UNSPECIFIED;
    }
  }
}

function createLinkType(type: coreTypes.LinkType) {
  switch (type) {
    case coreTypes.LinkType.CHILD_LINKED_SPAN: {
      return types.LinkType.CHILD_LINKED_SPAN;
    }
    case coreTypes.LinkType.PARENT_LINKED_SPAN: {
      return types.LinkType.PARENT_LINKED_SPAN;
    }
    default: {
      return types.LinkType.UNSPECIFIED;
    }
  }
}
