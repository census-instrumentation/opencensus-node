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
import { CumulativePoint } from './types';

/**
 * Cumulative metric is used to record aggregated metrics that represents a
 * single numerical value accumulated over a time interval. The value can only
 * increase or be reset to zero on restart or reset the event.
 */
export class Cumulative implements Meter {
  private readonly metricDescriptor: MetricDescriptor;
  private labelKeysLength: number;
  private defaultLabelValues: LabelValue[];
  private registeredPoints: Map<string, CumulativePoint> = new Map();
  private readonly constantLabelValues: LabelValue[];

  /**
   * Constructs a new Cumulative instance.
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
   * labelValues is not already associated with this cumulative, else returns an
   * existing Point.
   *
   * It is recommended to keep a reference to the Point instead of always
   * calling this method for manual operations.
   *
   * @param labelValues The list of the label values.
   * @returns The value of single cumulative.
   */
  getOrCreateTimeSeries(labelValues: LabelValue[]): CumulativePoint {
    validateArrayElementsNotNull(
      validateNotNull(labelValues, 'labelValues'),
      'labelValue'
    );
    return this.registerTimeSeries(labelValues);
  }

  /**
   * Returns a Point for a cumulative with all labels not set, or default
   * labels.
   *
   * @returns The value of single cumulative.
   */
  getDefaultTimeSeries(): CumulativePoint {
    return this.registerTimeSeries(this.defaultLabelValues);
  }

  /**
   * Removes the TimeSeries from the cumulative metric, if it is present. i.e.
   * references to previous Point objects are invalid (not part of the
   * metric).
   *
   * @param labelValues The list of label values.
   */
  removeTimeSeries(labelValues: LabelValue[]): void {
    validateNotNull(labelValues, 'labelValues');
    this.registeredPoints.delete(hashLabelValues(labelValues));
  }

  /**
   * Removes all TimeSeries from the cumulative metric. i.e. references to all
   * previous Point objects are invalid (not part of the metric).
   */
  clear(): void {
    this.registeredPoints.clear();
  }

  /**
   * Registers a TimeSeries and returns a Point if the specified
   * labelValues is not already associated with this cumulative, else returns an
   * existing Point.
   *
   * @param labelValues The list of the label values.
   * @returns The value of single cumulative.
   */
  private registerTimeSeries(labelValues: LabelValue[]): CumulativePoint {
    const hash = hashLabelValues(labelValues);
    // return if the specified labelValues is already associated with the point.
    if (this.registeredPoints.has(hash)) {
      return this.registeredPoints.get(hash)!;
    }
    if (this.labelKeysLength !== labelValues.length) {
      throw new Error("Label Keys and Label Values don't have same size");
    }

    const point = new CumulativePointEntry([
      ...labelValues,
      ...this.constantLabelValues,
    ]);
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
    const now: Timestamp = getTimestampWithProcessHRTime();
    return {
      descriptor: this.metricDescriptor,
      timeseries: Array.from(this.registeredPoints, ([_, point]) =>
        point.getTimeSeries(now)
      ),
    };
  }
}

/**
 * The value of a single point in the Cumulative.TimeSeries.
 */
export class CumulativePointEntry implements CumulativePoint {
  private readonly labelValues: LabelValue[];
  private startTimestamp: Timestamp;
  private value = 0;

  constructor(labelValues: LabelValue[]) {
    this.labelValues = labelValues;
    this.startTimestamp = getTimestampWithProcessHRTime();
  }

  /** Reset cumulative metric. */
  reset(): void {
    this.value = 0;
    this.startTimestamp = getTimestampWithProcessHRTime();
  }

  /**
   * Increment the cumulative metric.
   * @param val The new value.
   */
  inc(val?: number): void {
    if ((val && !Number.isFinite(val)) || (val !== undefined && isNaN(val))) {
      throw new TypeError(`Value is not a valid number: ${val}`);
    }
    if (val && val < 0) {
      throw new Error('It is not possible to decrease a cumulative metric');
    }
    const incValue = val === null || val === undefined ? 1 : val;
    this.value += incValue;
  }

  /**
   * Returns the TimeSeries with one or more Point.
   *
   * @param now The time at which the cumulative is recorded.
   * @returns The TimeSeries.
   */
  getTimeSeries(now: Timestamp): TimeSeries {
    return {
      labelValues: this.labelValues,
      points: [{ value: this.value, timestamp: now }],
      startTimestamp: this.startTimestamp,
    };
  }
}
