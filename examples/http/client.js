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

const tracing = require('@opencensus/nodejs');
const { ZipkinTraceExporter } = require('@opencensus/exporter-zipkin');
const { TraceContextFormat } = require('@opencensus/propagation-tracecontext');

/**
 * The trace instance needs to be initialized first, if you want to enable
 * automatic tracing for built-in plugins (HTTP in this case).
 * https://github.com/census-instrumentation/opencensus-node#plugins
 */
const tracer = setupTracerAndExporters();

const http = require('http');

/** A function which makes requests and handles response. */
function makeRequest () {
  // Root spans typically correspond to incoming requests, while child spans
  // typically correspond to outgoing requests. Here, we have manually created
  // the root span, which is created to track work that happens outside of the
  // request lifecycle entirely.
  tracer.startRootSpan({ name: 'octutorialsClient.makeRequest' }, rootSpan => {
    http.get({
      host: 'localhost',
      port: 8080,
      path: '/helloworld'
    }, (response) => {
      let body = [];
      response.on('data', chunk => body.push(chunk));
      response.on('end', () => {
        console.log(body.toString());
        rootSpan.end();
      });
    });
  });
}

function setupTracerAndExporters () {
  const zipkinOptions = {
    url: 'http://localhost:9411/api/v2/spans',
    serviceName: 'opencensus_tutorial'
  };

  // Creates Zipkin exporter
  const exporter = new ZipkinTraceExporter(zipkinOptions);

  // Starts tracing and set sampling rate, exporter and propagation
  const tracer = tracing.start({
    exporter,
    samplingRate: 1, // For demo purposes, always sample
    propagation: new TraceContextFormat(),
    logLevel: 1 // show errors, if any
  }).tracer;

  return tracer;
}

makeRequest();
