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

import { getTimestampWithProcessHRTime } from '../../common/time-util';
import {
  validateArrayElementsNotNull,
  validateNotNull,
} from '../../common/validations';
import {
  LabelKey,
  LabelValue,
  Metric,
  MetricDescriptor,
  MetricDescriptorType,
  TimeSeries,
  Timestamp,
} from '../export/types';
import { Meter } from '../types';
import { hashLabelValues, initializeDefaultLabels } from '../utils';
import * as types from './types';

/**
 * Gauge metric
 */
export class Gauge implements Meter {
  private readonly metricDescriptor: MetricDescriptor;
  private labelKeysLength: number;
  private defaultLabelValues: LabelValue[];
  private registeredPoints: Map<string, types.Point> = new Map();
  private readonly constantLabelValues: LabelValue[];

  private static readonly LABEL_VALUE = 'labelValue';
  private static readonly LABEL_VALUES = 'labelValues';
  private static readonly ERROR_MESSAGE_INVALID_SIZE =
    "Label Keys and Label Values don't have same size";

  /**
   * Constructs a new Gauge instance.
   *
   * @param name The name of the metric.
   * @param description The description of the metric.
   * @param unit The unit of the metric.
   * @param type The type of metric.
   * @param labelKeys The list of the label keys.
   * @param constantLabels The map of constant labels for the Metric.
   */
  constructor(
    name: string,
    description: string,
    unit: string,
    type: MetricDescriptorType,
    readonly labelKeys: LabelKey[],
    readonly constantLabels: Map<LabelKey, LabelValue>
  ) {
    this.labelKeysLength = labelKeys.length;
    const keysAndConstantKeys = [...labelKeys, ...constantLabels.keys()];
    this.constantLabelValues = [...constantLabels.values()];

    this.metricDescriptor = {
      name,
      description,
      unit,
      type,
      labelKeys: keysAndConstantKeys,
    };
    this.defaultLabelValues = initializeDefaultLabels(this.labelKeysLength);
  }

  /**
   * Creates a TimeSeries and returns a Point if the specified
   * labelValues is not already associated with this gauge, else returns an
   * existing Point.
   *
   * It is recommended to keep a reference to the Point instead of always
   * calling this method for manual operations.
   *
   * @param labelValues The list of the label values.
   * @returns The value of single gauge.
   */
  getOrCreateTimeSeries(labelValues: LabelValue[]): types.Point {
    validateArrayElementsNotNull(
      validateNotNull(labelValues, Gauge.LABEL_VALUES),
      Gauge.LABEL_VALUE
    );
    return this.registerTimeSeries(labelValues);
  }

  /**
   * Returns a Point for a gauge with all labels not set, or default
   * labels.
   *
   * @returns The value of single gauge.
   */
  getDefaultTimeSeries(): types.Point {
    return this.registerTimeSeries(this.defaultLabelValues);
  }

  /**
   * Removes the TimeSeries from the gauge metric, if it is present. i.e.
   * references to previous Point objects are invalid (not part of the
   * metric).
   *
   * @param labelValues The list of label values.
   */
  removeTimeSeries(labelValues: LabelValue[]): void {
    validateNotNull(labelValues, Gauge.LABEL_VALUES);
    this.registeredPoints.delete(hashLabelValues(labelValues));
  }

  /**
   * Removes all TimeSeries from the gauge metric. i.e. references to all
   * previous Point objects are invalid (not part of the metric).
   */
  clear(): void {
    this.registeredPoints.clear();
  }

  /**
   * Registers a TimeSeries and returns a Point if the specified
   * labelValues is not already associated with this gauge, else returns an
   * existing Point.
   *
   * @param labelValues The list of the label values.
   * @returns The value of single gauge.
   */
  private registerTimeSeries(labelValues: LabelValue[]): types.Point {
    const hash = hashLabelValues(labelValues);
    // return if the specified labelValues is already associated with the point.
    if (this.registeredPoints.has(hash)) {
      return this.registeredPoints.get(hash)!;
    }
    if (this.labelKeysLength !== labelValues.length) {
      throw new Error(Gauge.ERROR_MESSAGE_INVALID_SIZE);
    }

    const point = new PointEntry([...labelValues, ...this.constantLabelValues]);
    this.registeredPoints.set(hash, point);
    return point;
  }

  /**
   * Provides a Metric with one or more TimeSeries.
   *
   * @returns The Metric, or null if TimeSeries is not present in Metric.
   */
  getMetric(): Metric | null {
    if (this.registeredPoints.size === 0) {
      return null;
    }
    const timestamp: Timestamp = getTimestampWithProcessHRTime();
    return {
      descriptor: this.metricDescriptor,
      timeseries: Array.from(this.registeredPoints, ([_, point]) =>
        point.getTimeSeries(timestamp)
      ),
    };
  }
}

/**
 * The value of a single point in the Gauge.TimeSeries.
 */
export class PointEntry implements types.Point {
  private readonly labelValues: LabelValue[];
  private value = 0;

  constructor(labelValues: LabelValue[]) {
    this.labelValues = labelValues;
  }

  /**
   * Adds the given value to the current value. The values can be negative.
   *
   * @param amt The value to add.
   */
  add(amt: number): void {
    this.value = this.value + amt;
  }

  /**
   * Sets the given value.
   *
   * @param val The new value.
   */
  set(val: number): void {
    this.value = val;
  }

  /**
   * Returns the TimeSeries with one or more Point.
   *
   * @param timestamp The time at which the gauge is recorded.
   * @returns The TimeSeries.
   */
  getTimeSeries(timestamp: Timestamp): TimeSeries {
    return {
      labelValues: this.labelValues,
      points: [{ value: this.value, timestamp }],
    };
  }
}
