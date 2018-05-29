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

import {ZpagesExporter} from '../../zpages';
import {PageHandler} from '../types';

const ejs = require('ejs');

export class TraceConfigzPageHandler implements PageHandler {
  /** HTML page */
  private html: string;

  constructor() {
    this.html = '';
  }

  /**
   * Generate Zpages Trace Config HTML Page
   * @param params values to put in HTML template
   * @returns Output HTML
   */
  emitHtml(params?): string {
    /** template HTML */
    const traceConfigzFile =
        fs.readFileSync(__dirname + '/../templates/traceconfigz.html', 'utf8');
    /** EJS render options */
    const options = {delimiter: '?'};
    /** Zpages exporter object from current instance */
    const exporter = tracing.exporter as ZpagesExporter;

    const samplingProbability = this.extractSamplingProbability();

    if (!exporter.defaultConfig) {
      exporter.defaultConfig = {samplingRate: Number(samplingProbability)} as
          types.TracerConfig;
    }

    /** HTML table summary */
    this.html = ejs.render(
        traceConfigzFile,
        {defaultConfig: exporter.defaultConfig, samplingProbability}, options);

    return this.html;
  }

  /**
   * Gets the sample rate from tracer instance
   */
  private extractSamplingProbability(): string {
    const samplingProbability = tracing.tracer.sampler.description;
    if (samplingProbability === 'always') {
      return '1,0';
    } else if (samplingProbability === 'never') {
      return '0,0';
    }
    return samplingProbability.match(/\((.*)\)/)[1];
  }
}
