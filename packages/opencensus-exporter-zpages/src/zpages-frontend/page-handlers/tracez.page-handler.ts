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
import * as fs from 'fs';

import {TraceMap, ZpagesExporter} from '../../zpages';
import {LatencyBucketBoundaries} from '../latency-bucket-boundaries';
import {PageHandler} from '../types';

const ejs = require('ejs');
const timeunit = require('timeunit');

export class TracezPageHandler implements PageHandler {
  /** HTML page */
  private html: string;

  constructor() {
    this.html = '';
  }

  /**
   * Generate Zpages Tracez HTML Page
   * @param params values to put in HTML template
   * @returns Output HTML
   */
  emitHtml(params?): string {
    const tracezFile =
        fs.readFileSync(__dirname + '/../templates/tracez.html', 'utf8');
    const summaryFile =
        fs.readFileSync(__dirname + '/../templates/summary.html', 'utf8');
    const spanCellFile =
        fs.readFileSync(__dirname + '/../templates/span-cell.html', 'utf8');
    const spansFile =
        fs.readFileSync(__dirname + '/../templates/spans.html', 'utf8');
    /** ejs render options */
    const options = {delimiter: '?'};
    /** latency array */
    const latencyBucketBoundaries = LatencyBucketBoundaries.values();
    const exporter = tracing.exporter as ZpagesExporter;
    const traces = exporter.getTraces();

    /** latency names list */
    const latencyBucketNames = [];
    /** rootSpan lines */
    let spansCells = '';
    /** span list */
    let spans = '';
    /** control the striped table lines */
    let stripedCell = true;

    // build a string list of latencyBucketBoundaries
    for (const latency of latencyBucketBoundaries) {
      latencyBucketNames.push('[' + latency.toString() + ']');
    }

    // build the table lines
    for (const spanName of Object.keys(traces).sort()) {
      const spans = traces[spanName];
      const spanCell = {
        spanCellClass: stripedCell ? 'striped' : '',
        name: spanName,
        RUNNING: 0,
        ZERO_MICROSx10: 0,
        MICROSx10_MICROSx100: 0,
        MICROSx100_MILLIx1: 0,
        MILLIx1_MILLIx10: 0,
        MILLIx10_MILLIx100: 0,
        MILLIx100_SECONDx1: 0,
        SECONDx1_SECONDx10: 0,
        SECONDx10_SECONDx100: 0,
        SECONDx100_MAX: 0,
        errors: 0
      };

      // build span list
      for (const span of spans) {
        if (span.ended) {
          const durationNs = timeunit.milliseconds.toNanos(span.duration);
          for (const latency of latencyBucketBoundaries) {
            if (latency.belongs(durationNs)) {
              spanCell[latency.getName()] += 1;
              break;
            }
          }
        } else if (span.started) {
          spanCell['RUNNING'] += 1;
        }
      }

      spansCells += ejs.render(spanCellFile, spanCell, options);
      stripedCell = !stripedCell;
    }

    /** HTML table summary */
    const summary = ejs.render(summaryFile, {latencyBucketNames}, options);
    if (params.tracename) {
      spans = ejs.render(
          spansFile, {
            name: params.tracename,
            traces: exporter.getTraces(params.tracename)
          },
          options);
    }
    this.html = ejs.render(
        tracezFile,
        {table_content: summary + spansCells, title: 'TraceZ', spans}, options);

    return this.html;
  }
}
