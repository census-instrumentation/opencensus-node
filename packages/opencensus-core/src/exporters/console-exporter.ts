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
import {Measurement, View} from '../stats/types';
import {TagKey, TagValue} from '../tags/types';
import * as modelTypes from '../trace/model/types';
import {ExporterBuffer} from './exporter-buffer';
import {Exporter, ExporterConfig, StatsEventListener} from './types';

/** Do not send span data */
export class NoopExporter implements Exporter {
  logger?: loggerTypes.Logger;
  onStartSpan(root: modelTypes.Span) {}
  onEndSpan(root: modelTypes.Span) {}
  publish(rootSpans: modelTypes.Span[]) {
    return Promise.resolve();
  }
}

/** Format and sends span data to the console. */
export class ConsoleExporter implements Exporter {
  /** Buffer object to store the spans. */
  // @ts-ignore
  private logger?: loggerTypes.Logger;
  private buffer: ExporterBuffer;

  /**
   * Constructs a new ConsoleLogExporter instance.
   * @param config Exporter configuration object to create a console log
   *     exporter.
   */
  constructor(config: ExporterConfig) {
    this.buffer = new ExporterBuffer(this, config);
    this.logger = config.logger;
  }

  onStartSpan(span: modelTypes.Span) {}

  /**
   * Event called when a span is ended.
   * @param span Ended span.
   */
  onEndSpan(span: modelTypes.Span) {
    this.buffer.addToBuffer(span);
  }

  /**
   * Sends the spans information to the console.
   * @param rootSpans A list of root spans to publish.
   */
  publish(rootSpans: modelTypes.Span[]) {
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
export class ConsoleStatsExporter implements StatsEventListener {
  /**
   * Event called when a view is registered
   * @param view registered view
   * @param measure registered measure
   */
  onRegisterView(view: View) {
    console.log(`View registered: ${view.name}, Measure registered: ${
        view.measure.name}`);
  }
  /**
   * Event called when a measurement is recorded
   * @param view recorded view from measurement
   * @param measurement recorded measurement
   * @param tags The tags to which the value is applied
   */
  onRecord(
      views: View[], measurement: Measurement, tags: Map<TagKey, TagValue>) {
    console.log(`Measurement recorded: ${measurement.measure.name}`);
  }

  /**
   * Starts the Console exporter that polls Metric from Metrics library and
   * shows in the log console..
   */
  start(): void {
    // TODO(mayurkale): dependency with PR#253.
  }

  /** Stops the exporter. */
  stop(): void {}
}
