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

import {ZpagesExporter} from '../zpages';

import {createTraceConfigzHandler} from './controllers/traceconfigz.controller';
import {createTracezHandler} from './controllers/tracez.controller';

/**
 * Create a set of routes that consults the given TraceMap instance for span
 * data.
 * @param traceMap A span data store.
 */
export function createRoutes(traceMap: Map<string, types.Span[]>):
    express.Router {
  const router = express.Router();

  // Tracez Page
  router.get('/tracez', createTracezHandler(traceMap));

  // Trace Config Page
  router.get('/traceconfigz', createTraceConfigzHandler());

  // RPC Stats Page
  router.get('/rpcz', (req: express.Request, res: express.Response) => {
    res.status(200).send('working!');  // TODO
  });

  // Stats Page
  router.get('/statsz', (req: express.Request, res: express.Response) => {
    res.status(200).send('working!');  // TODO
  });

  return router;
}
