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

/**
 * This is an example of exporting a custom metric from
 * OpenCensus to Stackdriver.
 */

const { globalStats, MeasureUnit, AggregationType, TagMap } = require('@opencensus/core');
const { StackdriverStatsExporter } =
require('@opencensus/exporter-stackdriver');

const fs = require('fs');
const readline = require('readline');

// [START setup_exporter]
// Enable OpenCensus exporters to export metrics to Stackdriver Monitoring.
// Exporters use Application Default Credentials (ADCs) to authenticate.
// See https://developers.google.com/identity/protocols/application-default-credentials
// for more details.
// Expects ADCs to be provided through the environment as ${GOOGLE_APPLICATION_CREDENTIALS}
// A Stackdriver workspace is required and provided through the environment as ${GOOGLE_PROJECT_ID}
const projectId = process.env.GOOGLE_PROJECT_ID;

// GOOGLE_APPLICATION_CREDENTIALS are expected by a dependency of this code
// Not this code itself. Checking for existence here but not retaining (as not needed)
if (!projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw Error('Unable to proceed without a Project ID');
}
const exporter = new StackdriverStatsExporter({ projectId: projectId });

// Pass the created exporter to global Stats
globalStats.registerExporter(exporter);
// [END setup_exporter]

// The latency in milliseconds
const mLatencyMs = globalStats.createMeasureDouble(
  'repl/latency',
  MeasureUnit.MS,
  'The latency in milliseconds per REPL loop'
);

// Counts/groups the lengths of lines read in.
const mLineLengths = globalStats.createMeasureInt64(
  'repl/line_lengths',
  MeasureUnit.BYTE,
  'The distribution of line lengths'
);

// Create a stream to read our file
const stream = fs.createReadStream('./test.txt');

// Create an interface to read and process our file line by line
const lineReader = readline.createInterface({ input: stream });

const methodKey = { name: 'method' };
const statusKey = { name: 'status' };
const tagKeys = [methodKey, statusKey];

// Create & Register the view.
const latencyView = globalStats.createView(
  'demo/latency',
  mLatencyMs,
  AggregationType.DISTRIBUTION,
  tagKeys,
  'The distribution of the repl latencies',
  // Latency in buckets:
  // [>=25ms, >=50ms, >=75ms, >=100ms, >=200ms, >=400ms, >=600ms, >=800ms, >=1s, >=2s, >=4s, >=6s]
  [25, 50, 75, 100, 200, 400, 600, 800, 1000, 2000, 4000, 6000]
);
globalStats.registerView(latencyView);

// Create & Register the view.
const lineCountView = globalStats.createView(
  'demo/lines_in',
  mLineLengths,
  AggregationType.COUNT,
  tagKeys,
  'The number of lines from standard input'
);
globalStats.registerView(lineCountView);

// Create & Register the view.
const lineLengthView = globalStats.createView(
  'demo/line_lengths',
  mLineLengths,
  AggregationType.DISTRIBUTION,
  tagKeys,
  'Groups the lengths of keys in buckets',
  // Bucket Boudaries:
  // [>=5B, >=10B, >=15B, >=20B, >=40B, >=60B, >=80, >=100B, >=200B, >=400, >=600, >=800, >=1000]
  [5, 10, 15, 20, 40, 60, 80, 100, 200, 400, 600, 800, 1000]
);
globalStats.registerView(lineLengthView);

// The begining of our REPL loop
let [_, startNanoseconds] = process.hrtime();
let endNanoseconds;

// REPL is the read, evaluate, print and loop
lineReader.on('line', function (line) {
  // Read
  try {
    const processedLine = processLine(line); // Evaluate
    console.log(processedLine); // Print

    // Registers the end of our REPL
    [_, endNanoseconds] = process.hrtime();

    const tags = new TagMap();
    tags.set(methodKey, { value: 'REPL' });
    tags.set(statusKey, { value: 'OK' });

    globalStats.record([{
      measure: mLineLengths,
      value: processedLine.length
    }], tags);

    globalStats.record([{
      measure: mLatencyMs,
      value: sinceInMilliseconds(endNanoseconds, startNanoseconds)
    }], tags);
  } catch (err) {
    console.log(err);

    const errTags = new TagMap();
    errTags.set(methodKey, { value: 'repl' });
    errTags.set(statusKey, { value: 'ERROR' });
    globalStats.record([{
      measure: mLatencyMs,
      value: sinceInMilliseconds(endNanoseconds, startNanoseconds)
    }], errTags);
  }

  // Restarts the start time for the REPL
  startNanoseconds = endNanoseconds;
});

/**
 * The default export interval is 60 seconds. The thread with the
 * StackdriverStatsExporter must live for at least the interval past any
 * metrics that must be collected, or some risk being lost if they are recorded
 * after the last export.
 */
setTimeout(function () {
  console.log('Completed.');
}, 60 * 1000);

/**
 * Takes a line and process it.
 * @param {string} line The line to process
 */
function processLine (line) {
  // Currently, it just capitalizes it.
  return line.toUpperCase();
}

/**
 * Converts to milliseconds.
 * @param {number} endNanoseconds The end time of REPL.
 * @param {number} startNanoseconds The start time of REPL.
 */
function sinceInMilliseconds (endNanoseconds, startNanoseconds) {
  return (endNanoseconds - startNanoseconds) / 1e6;
}
