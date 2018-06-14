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
import {classes, types} from '@opencensus/opencensus-core';

import {ZpagesExporter} from '../../zpages';

const ejs = require('ejs');

export interface TraceConfigzParams {
  change: string;
  samplingprobability: number;
}

export interface TraceConfigzData {
  defaultConfig: {samplingRate: number};
  samplingProbability: number;
}

export class TraceConfigzPageHandler {
  /** Configuration defaults. Currently just the default sampling rate. */
  private defaultConfig: {samplingRate: number;};

  /**
   * Generate Zpages Trace Config HTML Page
   * @param params The incoming request query.
   * @param json If true, JSON will be emitted instead. Used for testing only.
   * @returns output HTML
   */
  emitHtml(params: Partial<TraceConfigzParams>, json: boolean): string {
    if (params) {
      this.saveChanges(params);
    }

    if (!this.defaultConfig) {
      this.defaultConfig = {
        samplingRate: TraceConfigzPageHandler.extractSamplingProbability()
      };
    }

    /** template HTML */
    const traceConfigzFile =
        ejs.fileLoader(__dirname + '/../templates/traceconfigz.ejs', 'utf8');
    /** EJS render options */
    const options = {delimiter: '?'};
    /** Current sampling rate  */
    const samplingProbability =
        TraceConfigzPageHandler.extractSamplingProbability();

    /** Rendering the HTML table summary */
    const renderParams: TraceConfigzData = {
      defaultConfig: this.defaultConfig,
      samplingProbability
    };
    if (json) {
      return JSON.stringify(renderParams, null, 2);
    } else {
      return ejs.render(traceConfigzFile, renderParams, options);
    }
  }

  /**
   * Saves changes made to Trace config page
   * @param query request query
   */
  private saveChanges(query: Partial<TraceConfigzParams>): void {
    /** restore the config to default */
    if (query.change === 'restore_default') {
      const exporter = tracing.exporter as ZpagesExporter;
      tracing.tracer.sampler =
          new classes.Sampler().probability(this.defaultConfig!.samplingRate);
      return;
    }

    /** change the sampling probability value */
    if (query.samplingprobability) {
      tracing.tracer.sampler =
          new classes.Sampler().probability(query.samplingprobability);
    }
  }

  /**
   * Gets the sample rate from tracer instance
   * @returns the sampling probability
   */
  private static extractSamplingProbability(): number {
    /**  */
    const samplingProbability = tracing.tracer.sampler.description;
    if (samplingProbability === 'always') {
      return 1;
    } else if (samplingProbability === 'never') {
      return 0;
    }
    return Number(samplingProbability.match(/\((.*)\)/)[1]);
  }
}
