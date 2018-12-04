/**
 * Copyright 2018, Google, Inc.
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
const { Stats, MeasureUnit, AggregationType } = require('@opencensus/core');
const { StackdriverStatsExporter } = require('@opencensus/exporter-stackdriver');

const app = express();
app.use(express.static("web_client"));
app.use(bodyParser.json());

// The project id must be provided. First, try the local environment
const project = process.env.GOOGLE_CLOUD_PROJECT;
assert(typeof project !== 'undefined' && project,
  "Please set environment variable GOOGLE_CLOUD_PROJECT to the project id.");
console.log(`Sending metrics data to project: ${project}`);

// OpenCensus setup
const stats = new Stats();
const exporter = new StackdriverStatsExporter({projectId: project});
stats.registerExporter(exporter);
const mDNSTimeMs = stats.createMeasureDouble("web_client/dnsTime",
                       MeasureUnit.MS,
                       "DNS lookup time");
const mConnectTimeMs = stats.createMeasureDouble("web_client/connctTime",
                       MeasureUnit.MS,
                       "TLS negotiation time");
const mLatencyMs = stats.createMeasureDouble("web_client/totalTime",
                       MeasureUnit.MS,
                       "Total page loading time");
const mClickCount = stats.createMeasureInt64("web_client/clickCount",
                       MeasureUnit.UNIT,
                       "Number of clicks");
const tagKey = "client";
const dnsTimeView = stats.createView(
  "webmetrics/dnstime",
  mDNSTimeMs,
  AggregationType.DISTRIBUTION,
  [tagKey],
  "The distribution of the DNS lookup time",
  // Bucket Boundaries:
  [0, 25, 50, 75, 100, 200, 400, 600, 800, 1000, 2000, 4000, 6000]
);
const connectTimeView = stats.createView(
  "webmetrics/connecttime",
  mConnectTimeMs,
  AggregationType.DISTRIBUTION,
  [tagKey],
  "TLS negotiation time",
  // Bucket Boundaries:
  [0, 25, 50, 75, 100, 200, 400, 600, 800, 1000, 2000, 4000, 6000]
);
const latencyView = stats.createView(
  "webmetrics/latency",
  mLatencyMs,
  AggregationType.DISTRIBUTION,
  [tagKey],
  "The distribution of the latencies",
  [0, 25, 50, 75, 100, 200, 400, 600, 800, 1000, 2000, 4000, 6000]
);
const clickCountView = stats.createView(
  "webmetrics/click_count",
  mClickCount,
  AggregationType.COUNT,
  [tagKey],
  "The number of lines from standard input"
);

// Process the metrics data posted to the server
app.post("/metrics", (req, res) => {
  let dnsTime = req.body["dnsTime"];
  let connectTime = req.body["connectTime"];
  let totalTime = req.body["totalTime"];
  let clickCount = req.body["count"];
  console.log(`totalTime ${totalTime}`);
  const tags = { "client": "web" };
  console.log(`dnsTime ${dnsTime}`);
  stats.record({
    measure: mDNSTimeMs,
    tags,
    value: dnsTime
  });
  console.log(`connectTime ${connectTime}`);
  stats.record({
    measure: mConnectTimeMs,
    tags,
    value: connectTime
  });
  console.log(`totalTime ${totalTime}`);
  stats.record({
    measure: mLatencyMs,
    tags,
    value: totalTime
  });
  console.log(`count ${clickCount}`);
  stats.record({
    measure: mClickCount,
    tags,
    value: clickCount
  });
  res.status(200).send("Received").end();
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

