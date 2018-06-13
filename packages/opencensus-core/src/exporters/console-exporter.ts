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

import * as loggerTypes from '../common/types';
import {Measure, Measurement, View} from '../stats/model/types';
import * as modelTypes from '../trace/model/types';

import {ExporterBuffer} from './exporter-buffer';
import * as types from './types';

/** Do not send span data */
export class NoopExporter implements types.Exporter {
  logger: loggerTypes.Logger;
  onStartSpan(root: modelTypes.RootSpan) {}
  onEndSpan(root: modelTypes.RootSpan) {}
  publish(rootSpans: modelTypes.RootSpan[]) {
    return Promise.resolve();
  }
}

/** Format and sends span data to the console. */
export class ConsoleExporter implements types.Exporter {
  /** Buffer object to store the spans. */
  private logger: loggerTypes.Logger;
  private buffer: ExporterBuffer;

  /**
   * Constructs a new ConsoleLogExporter instance.
   * @param config Exporter configuration object to create a console log
   * exporter.
   */
  constructor(config: types.ExporterConfig) {
    this.buffer = new ExporterBuffer(this, config);
    this.logger = config.logger;
  }
  onStartSpan(root: modelTypes.RootSpan) {}
  /**
   * Event called when a span is ended.
   * @param root Ended span.
   */
  onEndSpan(root: modelTypes.RootSpan) {
    this.buffer.addToBuffer(root);
  }
  /**
   * Sends the spans information to the console.
   * @param rootSpans
   */
  publish(rootSpans: modelTypes.RootSpan[]) {
    rootSpans.map((root) => {
      const ROOT_STR = `RootSpan: {traceId: ${root.traceId}, spanId: ${
          root.id}, name: ${root.name} }`;
      const SPANS_STR: string[] = root.spans.map(
          (span) => [`\t\t{spanId: ${span.id}, name: ${span.name}}`].join(
              '\n'));

      const result: string[] = [];
      result.push(
          ROOT_STR + '\n\tChildSpans:\n' +
          `${SPANS_STR.join('\n')}`);
      console.log(`${result}`);
    });
    return Promise.resolve();
  }
}

/** Exporter that receives stats data and shows in the log console. */
export class ConsoleStatsExporter implements types.StatsExporter {
  /**
   * Event called when a view is registered
   * @param view registered view
   * @param measure registered measure
   */
  onRegisterView(view: View, measure: Measure) {
    console.log(
        `View registered: ${view.name}, Measure registered: ${measure.name}`);
  }
  /**
   * Event called when a measurement is recorded
   * @param view recorded view from measurement
   * @param measurement recorded measurement
   */
  onRecord(view: View, measurement: Measurement) {
    console.log(`Measurement recorded: ${measurement.measure.name}, value: ${
        measurement.value}`);
  }
}
