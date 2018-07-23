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

import {AggregationData, AggregationType} from './aggregation/types';

/** Tags are maps of names -> values */
export interface Tags { [key: string]: string; }

/**
 * Describes the type of the individual values/measurements recorded by an
 * application. It includes information such as the type of measurement, the
 * units of measurement and descriptive names for the data. This provides the
 * fundamental type used for recording data.
 */
export interface Measure {
  /**
   * A string by which the measure will be referred to, e.g.
   * "rpc_server_latency". Names MUST be unique within the library.
   */
  readonly name: string;
  /** Describes the measure, e.g. "RPC latency in seconds". */
  readonly description?: string;
  /**
   * Describes the unit used for the Measure. Follows the format described by
   * http://unitsofmeasure.org/ucum.html.
   */
  readonly unit: MeasureUnit;
  /** The type used for this Measure. */
  readonly type: MeasureType;
}

/**
 * Describes the unit used for the Measure. Should follows the format described
 * by http://unitsofmeasure.org/ucum.html.
 */
export const enum MeasureUnit {
  unit = '1',    // for general counts
  byte = 'by',   // bytes
  kbyte = 'kb',  // Kbytes
  sec = 's',     // seconds
  ms = 'ms',     // millisecond
  ns = 'ns'      // nanosecond
}

/** Describes the types of a Measure. It can be Int64 or a Double type. */
export const enum MeasureType {
  int64 = 'INT64',
  double = 'DOUBLE'
}

/** Describes a data point to be collected for a Measure. */
export interface Measurement {
  /** The measure to which the value is applied */
  readonly measure: Measure;
  /** The recorded value */
  readonly value: number;
  /** The tags to which the value is applied */
  readonly tags: Tags;
}

/**
 * Defines how individual measurements are broken down by tags and aggregated.
 */
export interface View {
  /**
   * A string by which the View will be referred to, e.g. "rpc_latency". Names
   * MUST be unique within the library.
   */
  readonly name: string;
  /** Describes the view, e.g. "RPC latency distribution" */
  readonly description?: string;
  /** The Measure to which this view is applied. */
  readonly measure: Measure;
  /**
   * An Aggregation describes how data collected is aggregated.
   * There are four aggregation types: count, sum, lastValue and distirbution.
   */
  readonly aggregation: AggregationType;
  /** The start time for this view */
  readonly startTime: number;
  /**
   * The end time for this view - represents the last time a value was recorded
   */
  endTime: number;
  /** true if the view was registered */
  registered: boolean;
  /**  Returns a snapshot of an AggregationData for that tags/labels values */
  getSnapshot(tags: Tags): AggregationData;
  /** Returns a list of all AggregationData in the view */
  getSnapshots(): AggregationData[];
}
