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

import {Logger, MeasureManager} from '../..';
import {StatsExporter} from '../../exporters/types';

import {CounterMetric} from './metrics/counter';
import {GaugeMetric} from './metrics/gauge';
import {HistogramMetric} from './metrics/histogram';
import {Distribution, MetricDescriptor, MetricValues, SingleValue} from './metrics/types';


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
  name: string;
  /** Describes the measure, e.g. "RPC latency in seconds". */
  description: string;
  /**
   * Describes the unit used for the Measure. Follows the format described by
   * http://unitsofmeasure.org/ucum.html.
   */
  unit: MeasureUnit;
  /** The type used for this Measure. */
  type: string;
}

/**
 * Describes the unit used for the Measure. Should follows the format described
 * by http://unitsofmeasure.org/ucum.html.
 */
export const enum MeasureUnit {
  unit = '1',    // for general counts
  byte = 'by',   // bytes
  kbyte = 'kb',  // Kbytes
  sec = 's',     // seconds - maybe should be only 's'
  ms = 'ms',     // millisecond
  ns = 'ns'      // nanosecond
}

/**
 * Defines how individual measurements are broken down by tags and aggregated.
 */
export interface View {
  /**
   * A string by which the View will be referred to, e.g. "rpc_latency". Names
   * MUST be unique within the library.
   */
  name: string;
  /** Describes the view, e.g. "RPC latency distribution" */
  description: string;
  /** The Measure to which this view is applied. */
  measure: Measure;
  /**
   * An array of string representing columns labels or tag keys, concept similar
   * to dimensions on multidimensional modeling. These values associated with
   * those labels form the basis by which individual stats will be aggregated
   * (one aggregation per unique tag/label value). If none are provided, then
   * all data is recorded in a single aggregation.
   */
  columns: string[];
  /**
   * An Aggregation describes how data collected is aggregated.
   * There are four aggregation types:
   *  count, sum, lastValue and Distirbution (Histogram)
   */
  aggregation: AggregationType;
  /** The start time for this view */
  startTime: number;
  /**
   * The end time for this view - represents the last time a value was recorded
   */
  endTime: number;
  /** metric: mechanism underneath that will record and aggregate values. */
  metric: CounterMetric|GaugeMetric|HistogramMetric;
  /** true if the view was regitred */
  registred: boolean;
  /**
   * Record a tagged/label value to the view, a number of times -
   * for "label-less" counts incremented by 1, all parameters can be omitted.
   */
  recordValue(labelValues?: Tags|string[], value?: number, times?: number):
      void;
  /**  Returns a snapshot value of the view for all tags/labels values */
  getSnapshotValues(): MetricValues;
  /** Returns a snapshot value fo a specific tag/label value */
  getSnapshotValue(labelValues?: Tags|string[]): SingleValue|Distribution;
  /** Returns a MetricDescriptor for this view - Measure + Columns */
  getMetricDescriptor(): MetricDescriptor;
  /** Register a event listener */
  registerEventListener(eventListener: ViewEventListener): void;
}

/** A map of names -> Views  */
export interface RegisteredViews { [key: string]: View; }

/** Describes a data point to be collected for a Measure. */
export interface Measurement {
  /** The measure to which the value is applied. */
  measure: Measure;
  /** The recorded value */
  value: number;
}

/* Aggregation Type is the process of combining a certain set of values for a
 * given Measure. Currently supports 4 types of basic aggregation: Count, Sun,
 * LastValue, Distribution.
 */
export const enum AggregationType {
  count = 0,
  sum = 1,
  lastValue = 2,
  distribution = 3
}

/** A map of names -> Measures  */
export type RegisteredMeasures = {
  [key: string]: Measure;
};

/**
 * EventListerner for a View
 */
export interface ViewEventListener {
  /**
   * Event called when a view is registered
   * @param view registered view
   */
  onRegisterView(view: View): void;
  /**
   * Event called when a measurement is recorded
   * @param view recorded view from measurement
   */
  onRecord(view: View): void;
}
