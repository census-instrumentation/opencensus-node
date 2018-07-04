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
import {Measure, Measurement, MeasureUnit, Tags} from '../types';
import {Bucket, Distribution, Metric, MetricConfig, MetricDescriptor, MetricValues} from './types';

type MetricRecordMap<T> = {
  [key: string]: T
};

/**
 * Metric Base class implementation. Manages labelKeys, labelValues using a
 * MetricRecordMap.
 *
 * Type <R> must be a MetricRecorderMechanism implementation.
 */
export abstract class BaseMetric<R> implements Metric<R> {
  protected logger: Logger;
  protected labelKeys: string[];
  protected config: MetricConfig;
  private metricRecordMap: MetricRecordMap<R>;
  private localCurrentLabelValue: Tags = {};
  readonly metricDescriptor: MetricDescriptor;
  readonly startTime: number;


  constructor(config: MetricConfig) {
    this.config = config;
    this.metricDescriptor = config.descriptor;
    this.labelKeys = config.descriptor.labelKeys;
    this.logger = config.logger || logger.logger();
    this.startTime = Date.now();
    this.reset();
  }


  get currentLabelValue() {
    return this.localCurrentLabelValue;
  }

  /** If set, is used as default labelValue */
  set currentLabelValue(tags: Tags) {
    if (this.checkLabels(Object.keys(tags))) {
      this.localCurrentLabelValue = tags;
    } else {
      this.logger.error(`Can't set current label Value, cause value: ${
          tags} has properties not defined in ${this.labelKeys}`);
    }
  }

  /** Metric name uses descriptor name */
  get name() {
    return this.metricDescriptor.name;
  }

  /** Description same as descriptor description */
  get description() {
    return this.metricDescriptor.description;
  }

  get keys() {
    return Object.keys(this.metricRecordMap);
  }

  /**
   * Reset metric to initial state - remove all label values and its records
   * mechanisms
   */
  reset() {
    this.metricRecordMap = {};
  }

  /**
   * Returns the metric record mechansim associated to the labelValue, if
   * existed
   */
  getRecorder(tags?: Tags|string[]|string): R {
    if (typeof tags === 'string') {
      return this.metricRecordMap[tags];
    }
    if (tags instanceof Array) {
      tags = this.getTags(tags);
    }
    this.checkInitialization(tags);
    return this.metricRecordMap[this.getKey(tags)];
  }

  /**
   * Add/update a label value and returns its metric record mechansim
   * associated to it
   */
  labelValues(tags?: Tags|string[]): R {
    tags = tags || this.currentLabelValue;
    if (tags instanceof Array) {
      tags = this.getTags(tags);
    }
    const labels = Object.keys(tags);
    let current: R;
    if (this.checkLabels(labels)) {
      current = this.getRecorder(tags);
      if (!current) {
        current = this.createMetricHolder();
        this.metricRecordMap[this.getKey(tags)] = current;
      }
    }
    return current;
  }

  /** Converts a string[] of labelValues to a Tags representation */
  getTags(labelValues: string[]): Tags {
    if (!labelValues || labelValues.length !== this.labelKeys.length) return {};

    return labelValues.reduce((tags, label, index) => {
      tags[this.labelKeys[index]] = label;
      return tags;
    }, {} as Tags);
  }

  /** Returns a hashkey from a tag valeu */
  getKey(aTags: Tags): string {
    const tags: Tags = aTags || this.currentLabelValue;
    let labels = Object.keys(tags);
    if (labels.length > 1) {
      labels = labels.sort();
    }
    const hashSeed: string[] = [];
    labels.forEach(label => hashSeed.push(`\"${label}\":"${tags[label]}"`));
    return `{${hashSeed.join(',')}}`;
  }

  protected checkLabels(labels: string[]): boolean {
    let result = true;
    labels.forEach(label => {
      if (this.labelKeys.indexOf(label) === -1) {
        this.logger.error(
            `Label "${label}" is not part of tagLabels: ${this.labelKeys}`);
        result = false;
      }
    });
    return result;
  }

  private checkInitialization(tags: Tags) {
    tags = tags || {};
    if (this.checkLabels(Object.keys(tags))) {
      if (Object.keys(this.metricRecordMap).length === 0) {
        this.metricRecordMap[this.getKey(tags)] = this.createMetricHolder();
      }
    }
  }

  abstract record(value?: number, times?: number): void;
  abstract get metricSnapshotValues(): MetricValues;
  protected abstract createMetricHolder(): R;
  abstract get type(): string;
}
