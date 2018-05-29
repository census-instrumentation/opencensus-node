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

const tracezController = require('./controllers/tracez.controller');
const traceConfigzController = require('./controllers/traceconfigz.controller');

module.exports = (app: express.Application) => {
  // Tracez Page
  app.get('/tracez', tracezController.home);

  // Trace Config Page
  app.get('/traceconfigz', traceConfigzController.home);

  // RPC Stats Page
  app.get('/rpcz', (req: express.Request, res: express.Response) => {
    res.status(200).send('working!');  // TODO
  });

  // Stats Page
  app.get('/statsz', (req: express.Request, res: express.Response) => {
    res.status(200).send('working!');  // TODO
  });
};
