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
import {Counter} from './types';


/**
 * The counter is a record mechanism that counts how many times an event occurs.
 * It cannot be decremented.
 *
 * NumberCounter is a Counter Recorder Mechanism class using number
 */
export class NumberCounter implements Counter<number> {
  private logger: Logger;
  private localValue = 0;
  timestamp: number;
  startTime: number;
  endTime: number;

  constructor(alogger: Logger) {
    this.logger = alogger || logger.logger();
    this.startTime = Date.now();
  }

  /** Increments a counter n times - same as increment */
  record(value?: number): void {
    this.increment(value);
  }

  /** Increments a counter n times */
  increment(times: number): void {
    const inc = times || (times === 0) ? times : 1;
    this.timestamp = Date.now();
    this.endTime = this.timestamp;
    inc >= 0 ? this.localValue += inc :
               this.logger.warn('Ignored attempt to decrement counter [$name]');
  }

  /** Current counter value */
  get value() {
    return this.localValue;
  }

  reset(): void {
    this.localValue = 0;
    this.startTime = Date.now();
    this.timestamp = this.startTime;
    this.endTime = this.startTime;
  }
}

/**
 * CounterMetric calss is a Metric implementation unsing a Counter Recorder
 * Mechanism class
 */
export class CounterMetric extends BaseMetric<Counter<number>> {
  readonly type = 'counter';

  constructor(config: MetricConfig) {
    super(config);
  }

  get metricSnapshotValues(): MetricValues {
    const metricValues = this.keys.map((labelKey: string) => {
      const singleValue = {
        timestamp: this.getRecorder(labelKey).timestamp,
        value: this.getRecorder(labelKey).value,
        type: MetricValuesTypes.SINGLE,
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

  record(value?: number): void {
    this.increment(value);
  }

  protected createMetricHolder() {
    return new NumberCounter(this.logger);
  }
}
