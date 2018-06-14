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

import {types} from '@opencensus/opencensus-core';
import * as express from 'express';

import {TracezPageHandler} from './../page-handlers/tracez.page-handler';

/**
 * Creates an Express middleware that renders the Tracez view.
 * @param traceMap A span data store.
 */
export function createTracezHandler(traceMap: Map<string, types.Span[]>):
    express.Handler {
  return (req: express.Request, res: express.Response) => {
    const html = new TracezPageHandler(traceMap);
    res.send(html.emitHtml(req.query, req.query.json === '1'));
  };
}
