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

import * as logger from '../../common/console-logger';
import {Logger} from '../../common/types';

import {CounterMetric} from './metrics/counter';
import {GaugeMetric} from './metrics/gauge';
import {HistogramMetric} from './metrics/histogram';
import {HistogramMetricConfig, Metric, MetricConfig, MetricDescriptor, MetricValues, SingleValue} from './metrics/types';
import {Distribution} from './metrics/types';
import {AggregationType, Measure, Measurement, RegisteredViews, Tags, View, ViewEventListener} from './types';

/** Base class implementaion for Views */
class BaseView implements View {
  /**
   * A string by which the View will be referred to, e.g. "rpc_latency". Names
   * MUST be unique within the library.
   */
  readonly name: string;
  /** Describes the view, e.g. "RPC latency distribution" */
  readonly description: string;
  /** The Measure to which this view is applied. */
  readonly measure: Measure;
  /**
   * An array of string representing columns labels or tag keys, concept similar
   * to dimensions on multidimensional modeling. These values associated with
   * those labels form the basis by which individual stats will be aggregated
   * (one aggregation per unique tag/label value). If none are provided, then
   * all data is recorded in a single aggregation.
   */
  readonly columns: string[];
  /**
   * An Aggregation describes how data collected is aggregated.
   * There are four aggregation types:
   *  count, sum, lastValue and Distirbution (Histogram)
   */
  readonly aggregation: AggregationType;
  /** local metric */
  private localMetric: CounterMetric|GaugeMetric|HistogramMetric;
  /** only if AggregationType === Distribution */
  private bucketBoundaries: number[];
  /** logger propertie */
  private logger: Logger;
  /** local for endTime */
  private localEndTime: number;
  /** local for registered */
  private isRegistered = false;
  /** event listener */
  private eventListener: ViewEventListener;

  constructor(
      measure: Measure, aggregation: AggregationType, columns?: string[],
      bucketBoundaries?: number[], name?: string, description?: string,
      alogger?: Logger) {
    this.name = name || measure.name;
    this.description = description || measure.description;
    this.measure = measure;
    this.columns = columns || [];
    this.aggregation = aggregation;
    this.bucketBoundaries = bucketBoundaries || [];
    this.logger = alogger || logger.logger();
  }

  // the metric is created only the first time is required
  get metric() {
    if (!this.localMetric) {
      this.localMetric = this.createMetric();
    }
    return this.localMetric;
  }

  /**
   * Created the metric accordint to the AggregationType
   */
  private createMetric(): CounterMetric|GaugeMetric|HistogramMetric {
    const min = this.bucketBoundaries ? this.bucketBoundaries[0] : 0;
    const max = this.bucketBoundaries ?
        this.bucketBoundaries[this.bucketBoundaries.length - 1] :
        0;
    const config: HistogramMetricConfig = {
      descriptor: this.getMetricDescriptor(),
      logger: this.logger,
      boundaries: {range: {min, max}, bucketBoundaries: this.bucketBoundaries}
    };

    switch (this.aggregation) {
      case AggregationType.count:
        return new CounterMetric(config);
      case AggregationType.sum:
        config.useSumAsValue = true;
        return new GaugeMetric(config);
      case AggregationType.lastValue:
        return new GaugeMetric(config);
      case AggregationType.distribution:
        return new HistogramMetric(config);
      default:
        return new CounterMetric(config);
    }
  }

  /** The start time for this view */
  get startTime(): number {
    return this.metric.startTime;
  }

  /**
   *  The end time for this view - represents the last time a value was recorded
   */
  get endTime(): number {
    return this.localEndTime;
  }

  /**  Should be set to true by a ViewManager after register the view */
  set registered(value: boolean) {
    this.isRegistered = value;
    if (this.isRegistered && this.eventListener) {
      this.eventListener.onRegisterView(this);
    }
  }

  get registered(): boolean {
    return this.isRegistered;
  }

  /**
   * recordValue method when called, this method will use a metric instance to
   * record the value, according to the labels values.
   */
  recordValue(labelValues?: Tags|string[], value?: number, times?: number):
      void {
    this.metric.labelValues(labelValues).record(value, times);
    this.localEndTime = Date.now();
    if (this.isRegistered && this.eventListener) {
      this.eventListener.onRecord(this);
    }
  }

  /**  Returns a snapshot value of the view for all tags/labels values */
  getSnapshotValues(): MetricValues {
    return this.metric.metricSnapshotValues;
  }

  /** Returns a snapshot value fo a specific tag/label value */
  getSnapshotValue(labelValues?: Tags|string[]): SingleValue|Distribution {
    let key: string;
    key = (labelValues instanceof Array) ?
        this.metric.getKey(this.metric.getTags(labelValues)) :
        this.metric.getKey(labelValues);
    const index = this.metric.keys.indexOf(key);
    return this.metric.metricSnapshotValues[index];
  }

  /** Returns a MetricDescriptor for this view - Measure + Columns */
  getMetricDescriptor(): MetricDescriptor {
    return {
      name: this.name,
      description: this.description,
      unit: this.measure.unit,
      type: this.measure.type,
      labelKeys: this.columns
    };
  }

  /** register a event listener to the view */
  registerEventListener(eventListener: ViewEventListener): void {
    this.eventListener = eventListener;
  }
}

/** Class that work as factory and register for Views */
export class ViewManager {
  private static localRegisteredViews: RegisteredViews = {};


  /** Register a view by name - name must be unique */
  static registerView(view: View) {
    const existingMeasure = ViewManager.registeredViews[view.name];
    if (existingMeasure) {
      return;
    }
    ViewManager.registeredViews[view.name] = view;
    view.registered = true;
  }

  /** Gets registeredViews */
  static get registeredViews(): RegisteredViews {
    return ViewManager.localRegisteredViews;
  }

  /** Returns the view according to the name */
  static getView(name: string) {
    return ViewManager.registeredViews[name];
  }

  /** Retuns all registered views associated with a measure */
  static getViews(measure: Measure): View[] {
    const result = Object.keys(ViewManager.registeredViews)
                       .map(key => ViewManager.registeredViews[key])
                       .filter(view => view.measure === measure);
    return result ? result : [];
  }

  /**  Factory method to create a view which aggregationType = count  */
  static createCountView(
      measure: Measure, columns?: string[], name?: string, description?: string,
      logger?: Logger): View {
    const view = new BaseView(
        measure, AggregationType.count, columns, null, name, description,
        logger);
    return view;
  }

  /**  Factory method to create a view which aggregationType = sum  */
  static createSumView(
      measure: Measure, columns?: string[], name?: string, description?: string,
      logger?: Logger): View {
    const view = new BaseView(
        measure, AggregationType.sum, columns, null, name, description, logger);
    return view;
  }

  /**  Factory method to create a view which aggregationType = lastvalue  */
  static createLastValueView(
      measure: Measure, columns?: string[], name?: string, description?: string,
      logger?: Logger): View {
    const view = new BaseView(
        measure, AggregationType.lastValue, columns, null, name, description,
        logger);
    return view;
  }

  /**  Factory method to create a view which aggregationType = distribution  */
  static createDistribuitionView(
      measure: Measure, bucketBoundaries: number[], columns?: string[],
      name?: string, description?: string, logger?: Logger): View {
    const view = new BaseView(
        measure, AggregationType.distribution, columns, bucketBoundaries, name,
        description, logger);
    return view;
  }

  /** Clear view registers - unregister all current views   */
  static clearRegister() {
    ViewManager.localRegisteredViews = {};
  }
}
