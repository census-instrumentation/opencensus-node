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

import {getTimestampWithProcessHRTime} from '../../common/time-util';
import {validateArrayElementsNotNull, validateNotNull} from '../../common/validations';
import {LabelKey, LabelValue, Metric, MetricDescriptor, MetricDescriptorType, TimeSeries, Timestamp} from '../export/types';
import * as types from '../types';
import {hashLabelValues} from '../utils';

/**
 * Interface for objects with "length()" method.
 */
export interface LengthMethodInterface {
  length(): number;
}

/**
 * Interface for objects with "length" attribute (e.g. Array).
 */
export interface LengthAttributeInterface {
  length: number;
}

/**
 * Interface for objects with "size" method.
 */
export interface SizeMethodInterface {
  size(): number;
}

/**
 * Interface for objects with "size" attribute (e.g. Map, Set).
 */
export interface SizeAttributeInterface {
  size: number;
}

/**
 * Interface for objects with "getValue" method.
 */
export interface ToValueInterface {
  getValue(): number;
}

type ValueExtractor = () => number;
type ValueExtractorOrFunction = Function|ValueExtractor;

interface GaugeEntry {
  readonly labelValues: LabelValue[];
  readonly extractor: ValueExtractorOrFunction;
}

export type AccessorInterface = LengthAttributeInterface|LengthMethodInterface|
    SizeAttributeInterface|SizeMethodInterface|ToValueInterface;

/**
 * DerivedGauge metric
 */
export class DerivedGauge implements types.Meter {
  private metricDescriptor: MetricDescriptor;
  private labelKeysLength: number;
  private registeredPoints: Map<string, GaugeEntry> = new Map();
  private extractor?: ValueExtractorOrFunction;
  private readonly constantLabelValues: LabelValue[];

  private static readonly LABEL_VALUE = 'labelValue';
  private static readonly LABEL_VALUES = 'labelValues';
  private static readonly OBJECT = 'obj';
  private static readonly NUMBER = 'number';
  private static readonly FUNCTION = 'function';
  private static readonly ERROR_MESSAGE_INVALID_SIZE =
      'Label Keys and Label Values don\'t have same size';
  private static readonly ERROR_MESSAGE_DUPLICATE_TIME_SERIES =
      'A different time series with the same labels already exists.';
  private static readonly ERROR_MESSAGE_UNKNOWN_INTERFACE =
      'Unknown interface/object type';

  /**
   * Constructs a new DerivedGauge instance.
   *
   * @param {string} name The name of the metric.
   * @param {string} description The description of the metric.
   * @param {string} unit The unit of the metric.
   * @param {MetricDescriptorType} type The type of metric.
   * @param {LabelKey[]} labelKeys The list of the label keys.
   * @param {Map<LabelKey, LabelValue>} constantLabels The map of constant
   *     labels for the Metric.
   */
  constructor(
      name: string, description: string, unit: string,
      type: MetricDescriptorType, labelKeys: LabelKey[],
      readonly constantLabels: Map<LabelKey, LabelValue>) {
    this.labelKeysLength = labelKeys.length;
    const keysAndConstantKeys = [...labelKeys, ...constantLabels.keys()];
    this.constantLabelValues = [...constantLabels.values()];

    this.metricDescriptor =
        {name, description, unit, type, labelKeys: keysAndConstantKeys};
  }

  // Checks if the specified collection is a LengthAttributeInterface.
  // tslint:disable-next-line:no-any
  protected static isLengthAttributeInterface(obj: any):
      obj is LengthAttributeInterface {
    return obj && typeof obj.length === DerivedGauge.NUMBER;
  }

  // Checks if the specified collection is a LengthMethodInterface.
  // tslint:disable-next-line:no-any
  protected static isLengthMethodInterface(obj: any):
      obj is LengthMethodInterface {
    return obj && typeof obj.length === DerivedGauge.FUNCTION;
  }

  // Checks if the specified collection is a SizeAttributeInterface.
  // tslint:disable-next-line:no-any
  protected static isSizeAttributeInterface(obj: any):
      obj is SizeAttributeInterface {
    return obj && typeof obj.size === DerivedGauge.NUMBER;
  }

  // Checks if the specified collection is a SizeMethodInterface.
  // tslint:disable-next-line:no-any
  protected static isSizeMethodInterface(obj: any): obj is SizeMethodInterface {
    return obj && typeof obj.size === DerivedGauge.FUNCTION;
  }

  // Checks if the specified callbackFn is a ToValueInterface.
  // tslint:disable-next-line:no-any
  protected static isToValueInterface(obj: any): obj is ToValueInterface {
    return obj && typeof obj.getValue === DerivedGauge.FUNCTION;
  }

  /**
   * Creates a TimeSeries. The value of a single point in the TimeSeries is
   * observed from a obj or a function. The ValueExtractor is invoked whenever
   * metrics are collected, meaning the reported value is up-to-date.
   *
   * @param {LabelValue[]} labelValues The list of the label values.
   * @param objOrFn obj The obj to get the size or length or value from. If
   *     multiple options are available, the value (ToValueInterface) takes
   *     precedence first, followed by length and size. e.g value -> length ->
   *     size.
   *     fn is the function that will be called to get the current value
   *     of the gauge.
   */
  createTimeSeries(
      labelValues: LabelValue[], objOrFn: AccessorInterface|Function): void {
    validateArrayElementsNotNull(
        validateNotNull(labelValues, DerivedGauge.LABEL_VALUES),
        DerivedGauge.LABEL_VALUE);
    validateNotNull(objOrFn, DerivedGauge.OBJECT);

    const hash = hashLabelValues(labelValues);
    if (this.registeredPoints.has(hash)) {
      throw new Error(DerivedGauge.ERROR_MESSAGE_DUPLICATE_TIME_SERIES);
    }
    if (this.labelKeysLength !== labelValues.length) {
      throw new Error(DerivedGauge.ERROR_MESSAGE_INVALID_SIZE);
    }

    if (typeof objOrFn === 'function') {
      this.extractor = objOrFn;
    } else if (DerivedGauge.isToValueInterface(objOrFn)) {
      this.extractor = () => objOrFn.getValue();
    } else if (DerivedGauge.isLengthAttributeInterface(objOrFn)) {
      this.extractor = () => objOrFn.length;
    } else if (DerivedGauge.isLengthMethodInterface(objOrFn)) {
      this.extractor = () => objOrFn.length();
    } else if (DerivedGauge.isSizeAttributeInterface(objOrFn)) {
      this.extractor = () => objOrFn.size;
    } else if (DerivedGauge.isSizeMethodInterface(objOrFn)) {
      this.extractor = () => objOrFn.size();
    } else {
      throw new Error(DerivedGauge.ERROR_MESSAGE_UNKNOWN_INTERFACE);
    }

    this.registeredPoints.set(hash, {labelValues, extractor: this.extractor});
  }

  /**
   * Removes the TimeSeries from the gauge metric, if it is present. i.e.
   * references to previous Point objects are invalid (not part of the
   * metric).
   *
   * @param {LabelValue[]} labelValues The list of label values.
   */
  removeTimeSeries(labelValues: LabelValue[]): void {
    validateNotNull(labelValues, DerivedGauge.LABEL_VALUES);
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
   * Provides a Metric with one or more TimeSeries.
   *
   * @returns {Metric} The Metric.
   */
  getMetric(): Metric|null {
    if (this.registeredPoints.size === 0) {
      return null;
    }
    const timestamp: Timestamp = getTimestampWithProcessHRTime();
    return {
      descriptor: this.metricDescriptor,
      timeseries: Array.from(
          this.registeredPoints,
          ([_, gaugeEntry]) => ({
            labelValues:
                [...gaugeEntry.labelValues, ...this.constantLabelValues],
            points: [{value: gaugeEntry.extractor(), timestamp}]
          } as TimeSeries))
    };
  }
}
