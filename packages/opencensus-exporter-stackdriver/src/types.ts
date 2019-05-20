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

import {Bucket, ExporterConfig} from '@opencensus/core';
import {JWT, JWTInput} from 'google-auth-library';

export type Span = {
  name?: string,
  spanId?: string,
  parentSpanId?: string,
  displayName?: TruncatableString,
  startTime?: string,
  endTime?: string,
  attributes?: Attributes,
  stackTrace?: StackTrace,
  timeEvents?: TimeEvents,
  links?: Links,
  status?: Status,
  sameProcessAsParentSpan?: boolean,
  childSpanCount?: number
};

export type Attributes = {
  attributeMap?: {[key: string]: AttributeValue;};
  droppedAttributesCount?: number;
};

export type AttributeValue = {
  boolValue?: boolean;
  intValue?: string;
  stringValue?: TruncatableString;
};

export type TruncatableString = {
  value?: string;
  truncatedByteCount?: number;
};

export type Links = {
  droppedLinksCount?: number;
  link?: Link[];
};

export type Link = {
  attributes?: Attributes;
  spanId?: string;
  traceId?: string;
  type?: LinkType;
};

export type StackTrace = {
  stackFrames?: StackFrames;
  stackTraceHashId?: string;
};

export type StackFrames = {
  droppedFramesCount?: number;
  frame?: StackFrame[];
};

export type StackFrame = {
  columnNumber?: string;
  fileName?: TruncatableString;
  functionName?: TruncatableString;
  lineNumber?: string;
  loadModule?: Module;
  originalFunctionName?: TruncatableString;
  sourceVersion?: TruncatableString;
};

export type Module = {
  buildId?: TruncatableString;
  module?: TruncatableString;
};

export type Status = {
  code?: number;
  message?: string;
};

export type TimeEvents = {
  droppedAnnotationsCount?: number;
  droppedMessageEventsCount?: number;
  timeEvent?: TimeEvent[];
};

export type TimeEvent = {
  annotation?: Annotation;
  messageEvent?: MessageEvent;
  time?: string;
};

export type Annotation = {
  attributes?: Attributes;
  description?: TruncatableString;
};

export type MessageEvent = {
  id?: string;
  type?: Type;
  compressedSizeBytes?: string;
  uncompressedSizeBytes?: string;
};

export enum Type {
  TYPE_UNSPECIFIED = 0,
  SENT = 1,
  RECEIVED = 2
}

export enum LinkType {
  UNSPECIFIED = 0,
  CHILD_LINKED_SPAN = 1,
  PARENT_LINKED_SPAN = 2
}

export interface SpansWithCredentials {
  name: string;
  resource: {spans: {}};
  auth: JWT;
}

/**
 * Options for stackdriver configuration
 */
export interface StackdriverExporterOptions extends ExporterConfig {
  /**
   * Period in milliseconds sets the interval between uploading aggregated
   * metrics to stackdriver. Optional, default to 1 minute.
   */
  period?: number;
  /**
   * projectId project id defined to stackdriver
   */
  projectId: string;
  /**
   * Prefix for metric overrides the OpenCensus prefix
   * of a stackdriver metric. Optional
   */
  prefix?: string;
  /**
   * Create a JWT instance using the given credentials input containing
   * client_email and private_key properties. Optional
   */
  credentials?: JWTInput;

  /**
   * Is called whenever the exporter fails to upload metrics to stackdriver.
   * Optional
   */
  onMetricUploadError?: (err: Error) => void;
}

export enum MetricKind {
  UNSPECIFIED = 'METRIC_KIND_UNSPECIFIED',
  GAUGE = 'GAUGE',
  DELTA = 'DELTA',
  CUMULATIVE = 'CUMULATIVE'
}

export enum ValueType {
  VALUE_TYPE_UNSPECIFIED = 'VALUE_TYPE_UNSPECIFIED',
  INT64 = 'INT64',
  DOUBLE = 'DOUBLE',
  DISTRIBUTION = 'DISTRIBUTION'
}

export interface LabelDescriptor {
  key: string;
  valueType: string;
  description: string;
}

export interface MetricDescriptor {
  description: string;
  displayName: string;
  type: string;
  metricKind: MetricKind;
  valueType: ValueType;
  unit: string;
  labels: LabelDescriptor[];
}

export interface Distribution {
  count: number;
  mean: number;
  sumOfSquaredDeviation: number;
  bucketOptions: {explicitBuckets: {bounds: Bucket[];}};
  bucketCounts: number[];
}

export interface Point {
  interval: {endTime: string, startTime?: string};
  value: {
    boolValue?: boolean;
    int64Value?: number;
    doubleValue?: number;
    stringValue?: string;
    distributionValue?: Distribution;
  };
}

export interface TimeSeries {
  metric: {type: string; labels: {[key: string]: string};};
  resource: MonitoredResource;
  metricKind: MetricKind;
  valueType: ValueType;
  points: Point[];
}

/** Resource information. */
export interface MonitoredResource {
  /** Type identifier for the resource. */
  type: string;

  /** Set of labels that describe the resource. */
  labels: {[key: string]: string};
}
