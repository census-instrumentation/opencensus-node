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

import {ExporterConfig} from '@opencensus/core';
import {JWT} from 'google-auth-library';

export type TranslatedTrace = {
  projectId: string,
  traceId: string,
  spans: TranslatedSpan[]
};

export type TranslatedSpan = {
  name: string,
  kind: string,
  spanId: string,
  startTime: Date,
  endTime: Date,
  labels: Record<string, string>
};

/**
 * Options for stackdriver configuration
 */
export interface StackdriverExporterOptions extends ExporterConfig {
  /**
   * projectId project id defined to stackdriver
   */
  projectId: string;
}

export interface TracesWithCredentials {
  projectId: string;
  resource: {traces: {}};
  auth: JWT;
}

export enum MetricKind {
  UNSPECIFIED = 'METRIC_KIND_UNSPECIFIED',
  GAUGE = 'GAUGE',
  DELTA = 'DELTA',
  CUMULATIVE = 'CUMULATIVE'
}

export enum ValueType {
  VALUE_TYPE_UNSPECIFIED,
  BOOL,
  INT64,
  DOUBLE,
  STRING,
  DISTRIBUTION,
  MONEY
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
  count: string;
  mean: number;
  sumOfSquaredDeviation: number;
  range: {min: number; max: number;};
  bucketOptions: {explicitBuckets: {bounds: number[];}};
  bucketCounts: number[];
}

export interface Point {
  interval: {endTime: string, startTime: string};
  value: {
    boolValue?: boolean;
    int64Value?: string;
    doubleValue?: number;
    stringValue?: string;
    distributionValue?: Distribution;
  };
}

export interface TimeSeries {
  metric: {type: string; labels: {[key: string]: string};};
  resource: {type: 'global', labels: {[key: string]: string}};
  metricKind: MetricKind;
  valueType: ValueType;
  points: Point[];
}