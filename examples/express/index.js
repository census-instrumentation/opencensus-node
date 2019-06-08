/**
 * Copyright 2019, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * The trace instance needs to be initialized first, if you want to enable
 * automatic tracing for built-in plugins (HTTP in this case).
 * https://github.com/census-instrumentation/opencensus-node#plugins
 */

const port = process.env.APP_PORT || 3000;
const path = require('path');
const cookieParser = require('cookie-parser');
const tracing = require('@opencensus/nodejs');
const propagation = require('@opencensus/propagation-b3');

// Creates Zipkin exporter
const zipkin = require('@opencensus/exporter-zipkin');
const exporter = new zipkin.ZipkinTraceExporter({
  url: 'http://localhost:9411/api/v2/spans',
  serviceName: 'opencensus-express'
});

// NOTE: Please ensure that you start the tracer BEFORE initializing express app
// Starts tracing and set sampling rate, exporter and propagation
tracing.start({
  exporter,
  samplingRate: 1, // For demo purposes, always sample
  propagation: new propagation.B3Format(),
  logLevel: 1 // show errors, if any
});

const express = require('express');
const rp = require('request-promise');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/users', function (req, res) {
  console.log(`user headers: ${JSON.stringify(req.headers)}`);
  rp('http://localhost:3000/sample').then(data => {
    res.send(data);
  }, err => {
    console.error(`${err.message}`);
  });
});

app.get('/sample', function (req, res) {
  console.log(`sample headers: ${JSON.stringify(req.headers)}`);
  rp('https://jsonplaceholder.typicode.com/todos/1').then(data => {
    res.send(data);
  });
});

const http = require('http');
app.set('port', port);
const server = http.createServer(app);
server.listen(port);
