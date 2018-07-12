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

import * as logger from '../../../common/console-logger';
import {Logger} from '../../../common/types';
import {Measure, MeasureUnit, Tags} from '../types';

import {BaseMetric} from './metric';
import {MetricConfig, MetricDescriptor, MetricSingleValues, MetricValues, MetricValuesTypes} from './types';
import {Gauge} from './types';

/**
 * The gauge record a single value in a specific moment of time.
 * It can be incremented, decremented or set to a value.
 *
 * NumberGauge is a Gauge Recorder Mechanism class using number
 */
export class NumberGauge implements Gauge<number> {
  private logger: Logger;
  private currentValue = 0;
  timestamp: number;
  count = 0;
  sum = 0;
  startTime: number;
  endTime: number;

  constructor(alogger: Logger) {
    this.logger = alogger || logger.logger();
    this.startTime = Date.now();
  }

  /** set gauge value */
  set value(value: number) {
    this.timestamp = Date.now();
    this.endTime = this.timestamp;
    this.currentValue = value;
    ++this.count;
    this.sum += value;
  }

  /** increments the gauge n times */
  increment(times?: number): void {
    const inc = times || (times === 0) ? times : 1;
    this.value += inc;
  }

  /** decrements the gauge n times */
  decrement(times?: number): void {
    const inc = times || (times === 0) ? times : 1;
    this.value -= inc;
  }

  /** sets the gauge to value */
  set(value: number): void {
    this.value = value;
  }

  /** current gauge value */
  get value() {
    return this.currentValue;
  }

  /** sets the gauge to value - same as set method */
  record(value: number): void {
    this.set(value);
  }

  reset(): void {
    this.currentValue = 0;
    this.startTime = Date.now();
    this.timestamp = this.startTime;
    this.count = 0;
    this.sum = 0;
    this.endTime = this.startTime;
  }
}

/**
 * GaugeMetric is a Metric implementation unsing Gauge Recorder mechanism
 * class
 */
export class GaugeMetric extends BaseMetric<Gauge<number>> {
  readonly type = 'gauge';
  useSumAsValue: boolean;

  constructor(config: MetricConfig) {
    super(config);
    this.useSumAsValue = config.useSumAsValue ? config.useSumAsValue : false;
  }

  get metricSnapshotValues(): MetricValues {
    const metricValues = this.keys.map((labelKey: string) => {
      const singleValue = {
        timestamp: this.getRecorder(labelKey).timestamp,
        value: this.useSumAsValue ? this.getRecorder(labelKey).sum :
                                    this.getRecorder(labelKey).value,
        type: MetricValuesTypes.single,
        tags: JSON.parse(labelKey),
        labelKey
      };
      return singleValue;
    });
    return metricValues;
  }

  increment(value?: number) {
    this.labelValues().increment(value);
  }

  decrement(value?: number) {
    this.labelValues().decrement(value);
  }

  set(value: number) {
    this.labelValues().set(value);
  }

  record(value: number): void {
    this.set(value);
  }
  protected createMetricHolder() {
    return new NumberGauge(this.logger);
  }
}
