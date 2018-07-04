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

import * as logger from '../common/console-logger';
import {Logger} from '../common/types';
import {ConsoleStatsExporter} from '../exporters/console-exporter';
import {StatsExporter} from '../exporters/types';

import {MeasureManager} from './model/measure';
import {AggregationType, Measure, MeasureUnit, RegisteredViews, Tags, View, ViewEventListener} from './model/types';
import {ViewManager} from './model/view';


/** Manager the main stats actions */
export class Stats implements ViewEventListener {
  private logger: Logger;
  /** A list of view event listeners */
  private eventListenersLocal: ViewEventListener[] = [];

  constructor(userLogger?: Logger) {
    this.logger = userLogger ? userLogger : logger.logger();
  }

  /**
   * Registers an ViewEventListerner
   */
  registerViewEventListener(listener: ViewEventListener) {
    if (listener === this) return;
    const index = this.eventListenersLocal.indexOf(listener, 0);
    if (index < 0) {
      this.eventListenersLocal.push(listener);
    }
  }

  /**
   * Unregisters an ViewEventListener.
   */
  unregisterSpanEventListener(listener: ViewEventListener) {
    const index = this.eventListenersLocal.indexOf(listener, 0);
    if (index > -1) {
      this.eventListenersLocal.splice(index, 1);
    }
  }

  /**
   * Enable stats collection for the given {@link View}.
   * @param view
   */
  registerView(view: View): void {
    ViewManager.registerView(view);
  }

  /** Register stats exporter */
  registerExporter(exporter: StatsExporter) {
    this.registerViewEventListener(exporter);
  }

  /** Factory method that createas a Measure of type DOUBLE */
  createMeasureDouble(name: string, description: string, unit: MeasureUnit):
      Measure {
    return MeasureManager.createMeasureDouble(name, description, unit);
  }

  /** Factory method that createas a Measure of type INT64 */
  createMeasureInt64(name: string, description: string, unit: MeasureUnit):
      Measure {
    return MeasureManager.createMeasureInt64(name, description, unit);
  }

  /**  Factory method to create a view which aggregationType = count  */
  createCountView(
      measure: Measure, columns?: string[], name?: string,
      description?: string): View {
    const view = ViewManager.createCountView(
        measure, columns, name, description, this.logger);
    view.registerEventListener(this);
    return view;
  }

  /**  Factory method to create a view which aggregationType = sum  */
  createSumView(
      measure: Measure, columns?: string[], name?: string,
      description?: string): View {
    const view = ViewManager.createSumView(
        measure, columns, name, description, this.logger);
    view.registerEventListener(this);
    return view;
  }

  /**  Factory method to create a view which aggregationType = lastvalue  */
  createLastValueView(
      measure: Measure, columns?: string[], name?: string,
      description?: string): View {
    const view = ViewManager.createLastValueView(
        measure, columns, name, description, this.logger);
    view.registerEventListener(this);
    return view;
  }

  /**  Factory method to create a view which aggregationType = distribution  */
  createDistribuitionView(
      measure: Measure, bucketBoundaries: number[], columns?: string[],
      name?: string, description?: string): View {
    const view = ViewManager.createDistribuitionView(
        measure, bucketBoundaries, columns, name, description, this.logger);
    view.registerEventListener(this);
    return view;
  }

  /**
   * Returns the registered views
   */
  getRegisteredViews(): RegisteredViews {
    return ViewManager.registeredViews;
  }

  /** Returns the view according to the name */
  getView(name: string) {
    const result = ViewManager.getView(name);
    if (!result) {
      this.logger.error('Could not find view: %s', name);
    }
    return result;
  }

  /** Returns the view according to the name */
  getViews(measure: Measure) {
    return ViewManager.getViews(measure);
  }

  /** Record a value to all views that it is associated with a measure */
  record(measure: Measure, labelValues?: Tags|string[], value?: number) {
    for (const view of ViewManager.getViews(measure)) {
      view.recordValue(
          labelValues,
          (view.aggregation !== AggregationType.count) ? value : 1);
    }
  }

  /** Clear view registers - unregister all current views   */
  clearRegister() {
    ViewManager.clearRegister();
  }

  /**
   * Event called when a view is registered
   */
  onRegisterView(view: View): void {
    this.notifyOnRegisterListners(view);
  }

  /**
   * Event called when a measurement is recorded
   */
  onRecord(view: View): void {
    this.notifyOnRecordListeners(view);
  }

  private notifyOnRegisterListners(view: View) {
    this.logger.debug('starting to notify listeners to onRegisterView');
    if (this.eventListenersLocal && this.eventListenersLocal.length > 0) {
      for (const listener of this.eventListenersLocal) {
        listener.onRegisterView(view);
      }
    }
  }

  private notifyOnRecordListeners(view: View) {
    this.logger.debug('starting to notify listeners to onRecordView');
    if (this.eventListenersLocal && this.eventListenersLocal.length > 0) {
      for (const listener of this.eventListenersLocal) {
        listener.onRecord(view);
      }
    }
  }
}
