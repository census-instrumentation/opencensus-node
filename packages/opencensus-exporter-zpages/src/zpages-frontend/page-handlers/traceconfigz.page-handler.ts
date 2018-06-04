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

import {ZpagesExporter} from '../../zpages';

const ejs = require('ejs');

export class TraceConfigzPageHandler {
  /**
   * Generate Zpages Trace Config HTML Page
   * @returns output HTML
   */
  emitHtml(): string {
    /** template HTML */
    const traceConfigzFile =
        ejs.fileLoader(__dirname + '/../templates/traceconfigz.ejs', 'utf8');
    /** EJS render options */
    const options = {delimiter: '?'};
    /** Zpages exporter object from current instance */
    const exporter = tracing.exporter as ZpagesExporter;
    /** Current sampling rate  */
    const samplingProbability = this.extractSamplingProbability();

    /**
     * Checks if the current export has a defaultConfig, otherwise creates one
     */
    if (!exporter.defaultConfig) {
      exporter.defaultConfig = {samplingRate: samplingProbability} as
          types.TracerConfig;
    }

    /** Rendering the HTML table summary */
    return ejs.render(
        traceConfigzFile,
        {defaultConfig: exporter.defaultConfig, samplingProbability}, options);
  }

  /**
   * Gets the sample rate from tracer instance
   * @returns the sampling probability
   */
  private extractSamplingProbability(): number {
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
