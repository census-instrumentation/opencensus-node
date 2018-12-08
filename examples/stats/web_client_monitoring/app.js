/**
 * Copyright 2018, OpenCensus Authors
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * An Express application to receive the web metrics and send to Stackdriver
 * with the opencensus API.
 */

"use strict";

const express = require("express");
const assert = require('assert');
const process = require("process");
const bodyParser = require('body-parser');
// [START web_client_monitoring_imports]
const { Stats, MeasureUnit, AggregationType } = require('@opencensus/core');
const { StackdriverStatsExporter } = require('@opencensus/exporter-stackdriver');
// [END web_client_monitoring_imports]

const app = express();
app.use(express.static("web_client"));
app.use(bodyParser.json());

// The project id must be provided for running in a local environment
const project = process.env.GOOGLE_CLOUD_PROJECT;
assert(typeof project !== 'undefined' && project,
  "Please set environment variable GOOGLE_CLOUD_PROJECT to the project id.");
console.log(`Sending metrics data to project: ${project}`);

// OpenCensus setup
// [START web_client_monitoring_ocsetup]
const stats = new Stats();
const exporter = new StackdriverStatsExporter({projectId: project});
stats.registerExporter(exporter);
const mLatencyMs = stats.createMeasureDouble("webmetrics/latency",
                       MeasureUnit.MS,
                       "Latency related to page loading");
const mClickCount = stats.createMeasureInt64("webmetrics/click_count",
                       MeasureUnit.UNIT,
                       "Number of clicks");
const buckets = [0, 1, 2, 3, 4, 5, 6, 8, 10, 13, 16, 20, 25, 30, 40, 50, 65, 80,
                100, 130, 160, 200, 250, 300, 400, 500, 650, 800, 1000, 2000,
                5000, 10000, 20000, 50000, 100000];
const tagPhase = "phase";
const latencyView = stats.createView(
  "webmetrics/latency",
  mLatencyMs,
  AggregationType.DISTRIBUTION,
  [tagPhase],
  "Distribution of latencies",
  buckets
);
const clickCountView = stats.createView(
  "webmetrics/click_count",
  mClickCount,
  AggregationType.COUNT,
  [],
  "The number of button clicks"
);
// [END web_client_monitoring_ocsetup]

// Process the metrics data posted to the server
app.post("/metrics", (req, res) => {
  const dnsTime = req.body["dnsTime"];
  const connectTime = req.body["connectTime"];
  const totalTime = req.body["totalTime"];
  const clickCount = req.body["count"];
  console.log(`totalTime ${totalTime}`);
  console.log(`connectTime ${connectTime}`);
  console.log(`dnsTime ${dnsTime}`);
  console.log(`count ${clickCount}`);
  const valueTLSNegotiation = "tls_negotiation";
  const valueDNSLookup = "dns_lookup";
  const valueLoad = "load";
  let tags = { phase: valueDNSLookup };
  // [START web_client_monitoring_record]
  try {
    stats.record({
      measure: mLatencyMs,
      tags,
      value: dnsTime
    });
    tags = { phase: valueTLSNegotiation };
    stats.record({
      measure: mLatencyMs,
      tags,
      value: connectTime
    });
    tags = { phase: valueLoad };
    stats.record({
      measure: mLatencyMs,
      tags,
      value: totalTime
    });
    tags = {};
    stats.record({
      measure: mClickCount,
      tags,
      value: clickCount
    });
    res.status(200).send("Received").end();
    console.log('Competed recording metrics');
  } catch (err) {
    console.log(`Could not save stats: ${err}`);
    res.status(500).send("Error saving stats").end();
  }
  // [END web_client_monitoring_record]
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
