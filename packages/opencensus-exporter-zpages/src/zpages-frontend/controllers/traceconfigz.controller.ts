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
import * as express from 'express';
import {TraceConfigzPageHandler} from './../page-handlers/traceconfigz.page-handler';

/**
 * An Express middleware that renders the TraceConfigz view.
 */
export function createTraceConfigzHandler(): express.Handler {
  const html = new TraceConfigzPageHandler();
  return (req: express.Request, res: express.Response) => {
    res.send(html.emitHtml(req.query, req.query.json === '1'));
  };
}
