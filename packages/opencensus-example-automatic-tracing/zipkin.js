/**
 * Copyright 2018, OpenCensus Authors
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

const tracing = require('@opencensus/nodejs');
const zipkin = require('@opencensus/exporter-zipkin');

// Add your zipkin url and service name to the Zipkin options
const options = {
  url: 'your-zipkin-url',
  serviceName: 'your-service-name'
};
const exporter = new zipkin.ZipkinTraceExporter(options);

tracing.start({exporter});

// example application
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('Hello World!');
  res.end();
}).listen(8080);