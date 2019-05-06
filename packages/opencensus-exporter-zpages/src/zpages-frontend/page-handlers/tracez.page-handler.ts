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

import {Span} from '@opencensus/core';
import * as ejs from 'ejs';
import {LatencyBucketBoundaries} from '../latency-bucket-boundaries';
import {templatesDir} from './templates-dir';

export type TracezParams = {
  tracename: string; type: string;
};

/** Index to latencies */
export type Latency = {
  [key: string]: number
};

/**
 * Information needed to display selected traces.
 */
export interface SelectedTraces {
  name: string;
  traces: SerializedSpan[];
  getCanonicalCode: (status: number) => string;
}

export interface SerializedSpan {
  startTime: Date;
  duration: number;
  traceId?: string;
  id: string;
  parentSpanId?: string;
  spans?: SerializedSpan[];
}

/**
 * Information needed to create a span cell.
 */
export interface SpanCell {
  spanCellClass: string;
  name: string;
  RUNNING: number;
  latencies: Latency;
  ERRORS: number;
}

/**
 * Information used to render the Tracez UI.
 */
export interface TracezData {
  selectedTraces: SelectedTraces;
  spanCells: SpanCell[];
}

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
      return 'UNKNOWN';
  }
};

/**
 * Serializes known properties of a span.
 * The properties cloned are based on fields used in spans.ejs.
 * TODO(kjin): This is not a sustainable solution. Spans should be serializable.
 * This change should be made in the core module.
 * @param inputSpan The span to serialize.
 */
function serializeSpan(inputSpan: Span): SerializedSpan {
  const span: SerializedSpan = {
    startTime: inputSpan.startTime,
    duration: inputSpan.duration,
    traceId: inputSpan.traceId,
    id: inputSpan.id,
    parentSpanId: inputSpan.parentSpanId,
    spans: []
  };
  span.spans = inputSpan.spans.map((childSpan: Span) => ({
                                     startTime: childSpan.startTime,
                                     id: childSpan.id,
                                     name: childSpan.name,
                                     duration: childSpan.duration
                                   }));
  return span;
}

export class TracezPageHandler {
  constructor(private readonly traceMap: Map<string, Span[]>) {}

  private createSpanCell(spanName: string, stripedCell: boolean): SpanCell {
    const spans = this.traceMap.get(spanName)!;
    const spanCell: SpanCell = {
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
      },
      ERRORS: 0
    };

    // Building span list
    for (const span of spans) {
      if (span.status && span.status.code !== 0) {
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

    return spanCell;
  }

  /**
   * Generate Zpages Tracez HTML Page
   * @param params values to put in HTML template
   * @param json If true, JSON will be emitted instead. Used for testing only.
   * @returns Output HTML
   */
  emitHtml(params: Partial<TracezParams>, json: boolean): string {
    const tracezFile = ejs.fileLoader(`${templatesDir}/tracez.ejs`).toString();
    const stylesFile =
        ejs.fileLoader(`${templatesDir}/styles.min.css`).toString();
    const summaryFile =
        ejs.fileLoader(`${templatesDir}/summary.ejs`).toString();
    const spanCellFile =
        ejs.fileLoader(`${templatesDir}/span-cell.ejs`).toString();
    const spansFile = ejs.fileLoader(`${templatesDir}/spans.ejs`).toString();
    /** EJS render options */
    const options = {delimiter: '?'};
    /** Latency array */
    const latencyBucketBoundaries = LatencyBucketBoundaries.values;
    /** Latency names list */
    const latencyBucketNames = [];
    /** Controls the striped table lines */
    let stripedCell = true;
    /** Span cell data. */
    const spanCells: SpanCell[] = [];
    /** Selected traces. Populated only if the `tracename` param exists. */
    let selectedTraces: SelectedTraces|null = null;

    // Building a string list of latencyBucketBoundaries
    for (const latency of latencyBucketBoundaries) {
      latencyBucketNames.push(`[${latency}]`);
    }

    // Building the table lines
    const spanNames = Array.from(this.traceMap.keys()).sort();
    for (const spanName of spanNames) {
      spanCells.push(this.createSpanCell(spanName, stripedCell));
      stripedCell = !stripedCell;
    }

    /** Creating selected span list */
    if (params.tracename) {
      /** Keeps the selected span list */
      const traceList = [];
      if (this.traceMap.has(params.tracename)) {
        for (const span of this.traceMap.get(params.tracename)!) {
          if (params.type === 'ERRORS') {
            if (span.status.code !== 0) {
              traceList.push(span);
            }
          } else if (params.type === 'RUNNING') {
            if (span.started && !span.ended) {
              traceList.push(span);
            }
          } else if (span.ended && span.status.code === 0) {
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
      }
      selectedTraces = {
        name: params.tracename,
        traces: traceList.map(serializeSpan),
        getCanonicalCode
      };
    }

    /** Rendering the final HTML */
    if (json) {
      const jsonObj = {selectedTraces, spanCells} as TracezData;
      return JSON.stringify(jsonObj, null, 2);
    } else {
      /** HTML table summary */
      const renderedSummary =
          ejs.render(summaryFile, {latencyBucketNames}, options);
      /** HTML selected trace list */
      const renderedSelectedTraces: string =
          selectedTraces ? ejs.render(spansFile, selectedTraces, options) : '';
      /** RootSpan lines */
      const renderedSpanCells: string =
          spanCells.map(spanCell => ejs.render(spanCellFile, spanCell, options))
              .join('');
      return ejs.render(
          tracezFile, {
            styles: stylesFile,
            table_content: renderedSummary + renderedSpanCells,
            title: 'TraceZ Summary',
            selectedTraces: renderedSelectedTraces
          },
          options);
    }
  }
}
