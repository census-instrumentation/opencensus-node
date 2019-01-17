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
 * OpenCensus to Prometheus.
 */
/*jshint node:true, esversion: 6, laxcomma:true */
const { Stats, MeasureUnit, AggregationType } = require("@opencensus/core");
const { PrometheusStatsExporter } = require("@opencensus/exporter-prometheus");

const fs = require("fs");
const readline = require("readline");

// Create the Stats manager
const stats = new Stats();

// [START setup_exporter]
// Enable OpenCensus exporters to export metrics to Prometheus Monitoring.
const exporter = new PrometheusStatsExporter({
  // Metrics will be exported on https://localhost:{port}/metrics
  port: 9464,
  startServer: true
});

// Pass the created exporter to Stats
stats.registerExporter(exporter);
// [END setup_exporter]

// The latency in milliseconds
const mLatencyMs = stats.createMeasureDouble(
  "repl/latency",
  MeasureUnit.MS,
  "The latency in milliseconds per REPL loop"
);

// Counts/groups the lengths of lines read in.
const mLineLengths = stats.createMeasureInt64(
  "repl/line_lengths",
  MeasureUnit.BYTE,
  "The distribution of line lengths"
);

// Create a stream to read our file
const stream = fs.createReadStream("./test.txt");

// Create an interface to read and process our file line by line
const lineReader = readline.createInterface({ input: stream });

const tagKeys = ["method", "status"];

// Create & Register the view.
/*const latencyView = */stats.createView(
  "demo/latency",
  mLatencyMs,
  AggregationType.DISTRIBUTION,
  tagKeys,
  "The distribution of the repl latencies",
  // Latency in buckets:
  // [>=0ms, >=25ms, >=50ms, >=75ms, >=100ms, >=200ms, >=400ms, >=600ms, >=800ms, >=1s, >=2s, >=4s, >=6s]
  [0, 25, 50, 75, 100, 200, 400, 600, 800, 1000, 2000, 4000, 6000]
);
//stats.registerView(latencyView);

// Create & Register the view.
/*const lineCountView = */stats.createView(
  "demo/lines_in",
  mLineLengths,
  AggregationType.COUNT,
  tagKeys,
  "The number of lines from standard input"
);
//stats.registerView(lineCountView);

// Create & Register the view.
/*const lineLengthView = */stats.createView(
  "demo/line_lengths",
  mLineLengths,
  AggregationType.DISTRIBUTION,
  tagKeys,
  "Groups the lengths of keys in buckets",
  // Bucket Boudaries:
  // [>=0B, >=5B, >=10B, >=15B, >=20B, >=40B, >=60B, >=80, >=100B, >=200B, >=400, >=600, >=800, >=1000]
  [0, 5, 10, 15, 20, 40, 60, 80, 100, 200, 400, 600, 800, 1000]
);
//stats.registerView(lineLengthView);

// The begining of our REPL loop
let [_, startNanoseconds] = process.hrtime();
let endNanoseconds;

// REPL is the read, evaluate, print and loop
lineReader.on("line", function(line) {
  // Read
  try {
    const processedLine = processLine(line); // Evaluate
    console.log(processedLine); // Print

    // Registers the end of our REPL
    [_, endNanoseconds] = process.hrtime();

    const tags = { method: "repl", status: "OK" };

    stats.record({
      measure: mLineLengths,
      tags,
      value: processedLine.length
    });

    stats.record({
      measure: mLatencyMs,
      tags,
      value: sinceInMilliseconds(endNanoseconds, startNanoseconds)
    });
  } catch (err) {
    const errTags = { method: "repl", status: "ERROR", error: err.message };
    stats.record({
      measure: mLatencyMs,
      errTags,
      value: sinceInMilliseconds(endNanoseconds, startNanoseconds)
    });
  }

  // Restarts the start time for the REPL
  startNanoseconds = endNanoseconds;
});

/**
 * Takes a line and process it.
 * @param {string} line The line to process
 */
function processLine(line) {
  // Currently, it just capitalizes it.
  return line.toUpperCase();
}

/**
 * Converts to milliseconds.
 * @param {number} endNanoseconds The end time of REPL.
 * @param {number} startNanoseconds The start time of REPL.
 */
function sinceInMilliseconds(endNanoseconds, startNanoseconds) {
  return (endNanoseconds - startNanoseconds) / 1e6;
}

