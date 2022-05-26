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

import { Bucket, ExporterConfig } from '@opencensus/core';
import { JWT, JWTInput } from 'google-auth-library';

export interface Span {
  name?: string;
  spanId?: string;
  parentSpanId?: string;
  displayName?: TruncatableString;
  startTime?: string;
  endTime?: string;
  attributes?: Attributes;
  stackTrace?: StackTrace;
  timeEvents?: TimeEvents;
  links?: Links;
  status?: Status;
  sameProcessAsParentSpan?: boolean;
  childSpanCount?: number;
}

export interface Attributes {
  attributeMap?: { [key: string]: AttributeValue };
  droppedAttributesCount?: number;
}

export interface AttributeValue {
  boolValue?: boolean;
  intValue?: string;
  stringValue?: TruncatableString;
}

export interface TruncatableString {
  value?: string;
  truncatedByteCount?: number;
}

export interface Links {
  droppedLinksCount?: number;
  link?: Link[];
}

export interface Link {
  attributes?: Attributes;
  spanId?: string;
  traceId?: string;
  type?: LinkType;
}

export interface StackTrace {
  stackFrames?: StackFrames;
  stackTraceHashId?: string;
}

export interface StackFrames {
  droppedFramesCount?: number;
  frame?: StackFrame[];
}

export interface StackFrame {
  columnNumber?: string;
  fileName?: TruncatableString;
  functionName?: TruncatableString;
  lineNumber?: string;
  loadModule?: Module;
  originalFunctionName?: TruncatableString;
  sourceVersion?: TruncatableString;
}

export interface Module {
  buildId?: TruncatableString;
  module?: TruncatableString;
}

export interface Status {
  code?: number;
  message?: string;
}

export interface TimeEvents {
  droppedAnnotationsCount?: number;
  droppedMessageEventsCount?: number;
  timeEvent?: TimeEvent[];
}

export interface TimeEvent {
  annotation?: Annotation;
  messageEvent?: MessageEvent;
  time?: string;
}

export interface Annotation {
  attributes?: Attributes;
  description?: TruncatableString;
}

export interface MessageEvent {
  id?: string;
  type?: Type;
  compressedSizeBytes?: string;
  uncompressedSizeBytes?: string;
}

export enum Type {
  TYPE_UNSPECIFIED = 0,
  SENT = 1,
  RECEIVED = 2,
}

export enum LinkType {
  UNSPECIFIED = 0,
  CHILD_LINKED_SPAN = 1,
  PARENT_LINKED_SPAN = 2,
}

export interface SpansWithCredentials {
  name: string;
  resource: { spans: {} };
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
   * If this field is set, its contents will be used for authentication
   * instead of your application default credentials. Optional
   */
  credentials?: JWTInput;
  /**
   * The endpoint of the service. Defaults to cloudtrace.googleapis.com
   * for trace, and monitoring.googleapis.com for monitoring.
   */
  apiEndpoint?: string;

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
  CUMULATIVE = 'CUMULATIVE',
}

export enum ValueType {
  VALUE_TYPE_UNSPECIFIED = 'VALUE_TYPE_UNSPECIFIED',
  INT64 = 'INT64',
  DOUBLE = 'DOUBLE',
  DISTRIBUTION = 'DISTRIBUTION',
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
  bucketOptions: { explicitBuckets: { bounds: Bucket[] } };
  bucketCounts: number[];
  exemplars?: Exemplar[];
}

export interface Point {
  interval: { endTime: string; startTime?: string };
  value: {
    boolValue?: boolean;
    int64Value?: number;
    doubleValue?: number;
    stringValue?: string;
    distributionValue?: Distribution;
  };
}

export interface TimeSeries {
  metric: { type: string; labels: { [key: string]: string } };
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
  labels: { [key: string]: string };
}

/**
 * Exemplars are example points that may be used to annotate aggregated
 * Distribution values. They are metadata that gives information about a
 * particular value added to a Distribution bucket.
 */
export interface Exemplar {
  /** Value of the exemplar point. */
  value: number;
  /** The observation (sampling) time of the above value. */
  timestamp: string;
  /** Contextual information about the example value. */
  attachments: Any[];
}

/**
 * `Any` contains an arbitrary serialized protocol buffer message along with a
 * URL that describes the type of the serialized message.
 */
export interface Any {
  /**
   * A URL/resource name that uniquely identifies the type of the serialized
   * protocol buffer message.
   */
  '@type': string;

  /** Must be a valid serialized protocol buffer of the above specified type. */
  value: string;
}
