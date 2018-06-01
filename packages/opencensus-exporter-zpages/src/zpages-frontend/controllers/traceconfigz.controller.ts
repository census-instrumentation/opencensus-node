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
import {classes} from '@opencensus/opencensus-core';
import * as express from 'express';

import {ZpagesExporter} from '../../zpages';

import {TraceConfigzPageHandler} from './../page-handlers/traceconfigz.page-handler';

type SaveQuery = {
  change: string,
  samplingprobability: number
};

/**
 * Loads the Trace config page
 * @param req request data
 * @param res response data
 */
export const home = (req: express.Request, res: express.Response) => {
  const html = new TraceConfigzPageHandler();
  if (req.query) {
    saveChanges(req.query);
  }
  res.send(html.emitHtml());
};

/**
 * Saves changes made to Trace config page
 * @param query request query
 */
const saveChanges = (query: SaveQuery) => {
  /** restore the config to default */
  if (query.change === 'restore_default') {
    const exporter = tracing.exporter as ZpagesExporter;
    tracing.tracer.sampler =
        new classes.Sampler().probability(exporter.defaultConfig.samplingRate);
    return;
  }

  /** change the sampling probability value */
  if (query.samplingprobability) {
    tracing.tracer.sampler =
        new classes.Sampler().probability(query.samplingprobability);
  }
};
