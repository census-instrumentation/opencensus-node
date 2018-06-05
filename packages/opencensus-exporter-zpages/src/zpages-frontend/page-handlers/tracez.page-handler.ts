/**
 * Copyright 2018 OpenCensus Authors.
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

import * as tracing from '@opencensus/nodejs';
import {types} from '@opencensus/opencensus-core';

import {TraceMap, ZpagesExporter} from '../../zpages';
import {LatencyBucketBoundaries} from '../latency-bucket-boundaries';

const ejs = require('ejs');

export type TraceConfigzParams = {
  tracename: string; type: string;
};

/** Index to latencies */
type Latency = {
  [key: string]: number
};

/** Get canononical code from TraceStatusCodes */
const getCanonicalCode = (status: number) => {
  switch (status) {
    case 0:
      return 'OK';
    case 2:
      return 'UNKNOWN';
    case 3:
      return 'INVALID_ARGUMENT';
    case 4:
      return 'DEADLINE_EXCEEDED';
    case 5:
      return 'NOT_FOUND';
    case 7:
      return 'PERMISSION_DENIED';
    case 8:
      return 'RESOURCE_EXHAUSTED';
    case 12:
      return 'UNIMPLEMENTED';
    case 14:
      return 'UNAVAILABLE';
    case 16:
      return 'UNAUTHENTICATED';
    default:
      return null;
  }
};

export class TracezPageHandler {
  constructor() {}

  /**
   * Generate Zpages Tracez HTML Page
   * @param params values to put in HTML template
   * @returns Output HTML
   */
  emitHtml(params?: TraceConfigzParams): string {
    const tracezFile =
        ejs.fileLoader(__dirname + '/../templates/tracez.ejs', 'utf8');
    const summaryFile =
        ejs.fileLoader(__dirname + '/../templates/summary.ejs', 'utf8');
    const spanCellFile =
        ejs.fileLoader(__dirname + '/../templates/span-cell.ejs', 'utf8');
    const spansFile =
        ejs.fileLoader(__dirname + '/../templates/spans.ejs', 'utf8');
    /** EJS render options */
    const options = {delimiter: '?'};
    /** Latency array */
    const latencyBucketBoundaries = LatencyBucketBoundaries.values;
    /** Zpages exporter singleton instance */
    const zpages = tracing.exporter as ZpagesExporter;
    /** Trace list */
    const traces = zpages.getAllTraces();
    /** Latency names list */
    const latencyBucketNames = [];
    /** RootSpan lines */
    let spansCells = '';
    /** HTML selected trace list */
    let selectedTraces = '';
    /** Controls the striped table lines */
    let stripedCell = true;

    // Building a string list of latencyBucketBoundaries
    for (const latency of latencyBucketBoundaries) {
      latencyBucketNames.push(`[${latency}]`);
    }

    // Building the table lines
    for (const spanName of Object.keys(traces).sort()) {
      const spans = traces[spanName];
      const spanCell = {
        spanCellClass: stripedCell ? 'striped' : '',
        name: spanName,
        RUNNING: 0,
        latencies: {
          ZERO_MICROSx10: 0,
          MICROSx10_MICROSx100: 0,
          MICROSx100_MILLIx1: 0,
          MILLIx1_MILLIx10: 0,
          MILLIx10_MILLIx100: 0,
          MILLIx100_SECONDx1: 0,
          SECONDx1_SECONDx10: 0,
          SECONDx10_SECONDx100: 0,
          SECONDx100_MAX: 0
        } as Latency,
        ERRORS: 0
      };

      // Building span list
      for (const span of spans) {
        if (span.status && span.status !== 0) {
          spanCell.ERRORS += 1;
        } else if (span.ended) {
          const durationNs =
              LatencyBucketBoundaries.millisecondsToNanos(span.duration);
          const latency =
              LatencyBucketBoundaries.getLatencyBucketBoundariesByTime(
                  durationNs);
          spanCell.latencies[latency.getName()] += 1;
        } else if (span.started) {
          spanCell.RUNNING += 1;
        }
      }
      /** Rendering table lines */
      spansCells += ejs.render(spanCellFile, spanCell, options);
      stripedCell = !stripedCell;
    }

    /** HTML table summary */
    const summary = ejs.render(summaryFile, {latencyBucketNames}, options);

    /** Creating selected span list */
    if (params.tracename) {
      /** Keeps the selected span list */
      const traceList = [];
      for (const span of traces[params.tracename]) {
        if (params.type === 'ERRORS') {
          if (span.status !== 0) {
            traceList.push(span);
          }
        } else if (params.type === 'RUNNING') {
          if (span.started && !span.ended) {
            traceList.push(span);
          }
        } else if (span.ended && span.status === 0) {
          const durationNs =
              LatencyBucketBoundaries.millisecondsToNanos(span.duration);
          const latency =
              LatencyBucketBoundaries.getLatencyBucketBoundariesByTime(
                  durationNs);
          if (latency.getName() === params.type) {
            traceList.push(span);
          }
        }
      }
      /** Rendering the HTML */
      selectedTraces = ejs.render(
          spansFile,
          {name: params.tracename, traces: traceList, getCanonicalCode},
          options);
    }

    /** Rendering the final HTML */
    return ejs.render(
        tracezFile,
        {table_content: summary + spansCells, title: 'TraceZ', selectedTraces},
        options);
  }
}
