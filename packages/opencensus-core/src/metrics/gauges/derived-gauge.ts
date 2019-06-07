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
import * as types from '../types';
import { AccessorInterface } from '../types';
import * as util from '../utils';

type ValueExtractor = () => number;

interface GaugeEntry {
  readonly labelValues: LabelValue[];
  readonly extractor: ValueExtractor;
}

/**
 * DerivedGauge metric
 */
export class DerivedGauge implements types.Meter {
  private metricDescriptor: MetricDescriptor;
  private labelKeysLength: number;
  private registeredPoints: Map<string, GaugeEntry> = new Map();
  private extractor?: ValueExtractor;
  private readonly constantLabelValues: LabelValue[];

  private static readonly LABEL_VALUE = 'labelValue';
  private static readonly LABEL_VALUES = 'labelValues';
  private static readonly OBJECT = 'obj';
  private static readonly ERROR_MESSAGE_INVALID_SIZE =
    "Label Keys and Label Values don't have same size";
  private static readonly ERROR_MESSAGE_DUPLICATE_TIME_SERIES =
    'A different time series with the same labels already exists.';
  private static readonly ERROR_MESSAGE_UNKNOWN_INTERFACE =
    'Unknown interface/object type';

  /**
   * Constructs a new DerivedGauge instance.
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
    labelKeys: LabelKey[],
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
  }

  /**
   * Creates a TimeSeries. The value of a single point in the TimeSeries is
   * observed from a obj or a function. The ValueExtractor is invoked whenever
   * metrics are collected, meaning the reported value is up-to-date.
   *
   * @param labelValues The list of the label values.
   * @param objOrFn obj The obj to get the size or length or value from. If
   *     multiple options are available, the value (ToValueInterface) takes
   *     precedence first, followed by length and size. e.g value -> length ->
   *     size.
   *     fn is the function that will be called to get the current value
   *     of the gauge.
   */
  createTimeSeries(
    labelValues: LabelValue[],
    objOrFn: AccessorInterface
  ): void {
    validateArrayElementsNotNull(
      validateNotNull(labelValues, DerivedGauge.LABEL_VALUES),
      DerivedGauge.LABEL_VALUE
    );
    validateNotNull(objOrFn, DerivedGauge.OBJECT);

    const hash = util.hashLabelValues(labelValues);
    if (this.registeredPoints.has(hash)) {
      throw new Error(DerivedGauge.ERROR_MESSAGE_DUPLICATE_TIME_SERIES);
    }
    if (this.labelKeysLength !== labelValues.length) {
      throw new Error(DerivedGauge.ERROR_MESSAGE_INVALID_SIZE);
    }

    if (objOrFn instanceof Function) {
      this.extractor = objOrFn;
    } else if (util.isToValueInterface(objOrFn)) {
      this.extractor = () => objOrFn.getValue();
    } else if (util.isLengthAttributeInterface(objOrFn)) {
      this.extractor = () => objOrFn.length;
    } else if (util.isLengthMethodInterface(objOrFn)) {
      this.extractor = () => objOrFn.length();
    } else if (util.isSizeAttributeInterface(objOrFn)) {
      this.extractor = () => objOrFn.size;
    } else if (util.isSizeMethodInterface(objOrFn)) {
      this.extractor = () => objOrFn.size();
    } else {
      throw new Error(DerivedGauge.ERROR_MESSAGE_UNKNOWN_INTERFACE);
    }

    this.registeredPoints.set(hash, { labelValues, extractor: this.extractor });
  }

  /**
   * Removes the TimeSeries from the gauge metric, if it is present. i.e.
   * references to previous Point objects are invalid (not part of the
   * metric).
   *
   * @param labelValues The list of label values.
   */
  removeTimeSeries(labelValues: LabelValue[]): void {
    validateNotNull(labelValues, DerivedGauge.LABEL_VALUES);
    this.registeredPoints.delete(util.hashLabelValues(labelValues));
  }

  /**
   * Removes all TimeSeries from the gauge metric. i.e. references to all
   * previous Point objects are invalid (not part of the metric).
   */
  clear(): void {
    this.registeredPoints.clear();
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
      timeseries: Array.from(
        this.registeredPoints,
        ([_, gaugeEntry]): TimeSeries => ({
          labelValues: [...gaugeEntry.labelValues, ...this.constantLabelValues],
          points: [{ value: gaugeEntry.extractor(), timestamp }],
        })
      ),
    };
  }
}
