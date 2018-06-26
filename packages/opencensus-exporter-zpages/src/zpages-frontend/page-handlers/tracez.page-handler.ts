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

import {RootSpan, Span} from '@opencensus/core';

import {LatencyBucketBoundaries} from '../latency-bucket-boundaries';

const ejs = require('ejs');

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
  traces: Array<Partial<Span>>;
  getCanonicalCode: (status: number) => string;
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
      return null;
  }
};

/**
 * Serializes known properties of a span.
 * The properties cloned are based on fields used in spans.ejs.
 * TODO(kjin): This is not a sustainable solution. Spans should be serializable.
 * This change should be made in the core module.
 * @param inputSpan The span to serialize.
 */
function serializeSpan(inputSpan: Span|RootSpan): Partial<Span> {
  const span: Partial<Span> = {
    startTime: inputSpan.startTime,
    duration: inputSpan.duration,
    traceId: inputSpan.traceId,
    id: inputSpan.id,
    parentSpanId: inputSpan.id
  };
  if (inputSpan.isRootSpan) {
    // We possibly need to assign the spans field that is only available
    // on root spans. The core module doesn't export this as an
    // exportable field.
    // tslint:disable-next-line:no-any
    (span as any).spans =
        (inputSpan as RootSpan).spans.map((childSpan: Span) => ({
                                            startTime: childSpan.startTime,
                                            id: childSpan.id,
                                            name: childSpan.name,
                                            duration: childSpan.duration
                                          }));
  }
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

    return spanCell;
  }

  /**
   * Generate Zpages Tracez HTML Page
   * @param params values to put in HTML template
   * @param json If true, JSON will be emitted instead. Used for testing only.
   * @returns Output HTML
   */
  emitHtml(params: Partial<TracezParams>, json: boolean): string {
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
      }
      selectedTraces = {
        name: params.tracename,
        traces: traceList.map(serializeSpan),
        getCanonicalCode
      };
    }

    /** Rendering the final HTML */
    if (json) {
      return JSON.stringify({selectedTraces, spanCells}, null, 2);
    } else {
      /** HTML table summary */
      const renderedSummary =
          ejs.render(summaryFile, {latencyBucketNames}, options);
      /** HTML selected trace list */
      const renderedSelectedTraces: string = selectedTraces ?
          ejs.render(spansFile, {selectedTraces}, options) :
          '';
      /** RootSpan lines */
      const renderedSpanCells: string =
          spanCells.map(spanCell => ejs.render(spanCellFile, spanCell, options))
              .join('');
      return ejs.render(
          tracezFile, {
            table_content: renderedSummary + renderedSpanCells,
            title: 'TraceZ',
            selectedTraces: renderedSelectedTraces
          },
          options);
    }
  }
}
