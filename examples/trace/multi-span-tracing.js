/**
 * Copyright 2019, OpenCensus Authors
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

/** Example showing how to directly create a child span and add annotations. */
const tracing = require('@opencensus/nodejs');
const { ZipkinTraceExporter } = require('@opencensus/exporter-zipkin');

// 1. Get the global singleton Tracer object
// 2. Configure 100% sample rate, otherwise, few traces will be sampled.
const tracer = tracing.start({ samplingRate: 1 }).tracer;

// 3. Configure exporter to export traces to Zipkin.
tracer.registerSpanEventListener(new ZipkinTraceExporter({
  url: 'http://localhost:9411/api/v2/spans',
  serviceName: 'node.js-quickstart'
}));

function main () {
  // 4. Create a span. A span must be closed.
  // For any of the web frameworks for which we provide built-in plugins (http,
  // grpc, mongodb etc), a root span is automatically started whenever an
  // incoming request is received (in other words, all middleware already runs
  // within a root span).
  tracer.startRootSpan({ name: 'main' }, rootSpan => {
    for (let i = 0; i < 10; i++) {
      doWork();
    }

    // Be sure to call rootSpan.end().
    rootSpan.end();
  });

  // Add short delay to allow data to export.
  setTimeout(() => {
    console.log('done.');
  }, 2000);
}

function doWork () {
  // 5. Start another span. In this example, the main method already started a
  // span, so that'll be the parent span, and this will be a child span.
  const span = tracer.startChildSpan({ name: 'doWork' });

  console.log('doing busy work');
  for (let i = 0; i <= 40000000; i++) {} // short delay

  // 6. Annotate our span to capture metadata about our operation
  span.addAnnotation('invoking doWork');
  for (let i = 0; i <= 20000000; i++) {} // short delay

  span.end();
}

main();
