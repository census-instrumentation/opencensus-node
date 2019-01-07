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

/**
 * This is an example shows how to create a Derived Gauge metric.
 * Derived Gauge metric API is to report instantaneous measurement of an
 * int64/double value. Gauges can go both up and down. The gauges values
 * can be negative.
 */

const { Metrics, MeasureUnit } = require("@opencensus/core");

// a registry is a collection of metric objects.
const metricRegistry = Metrics.getMetricRegistry();

// application labels - applied to each metric / gauge.
const labelKeys = [{ key: "Method", description: "desc" }];
const labelValues = [{ value: "GET" }];

// a new gauge instance - builds a new Int64 derived gauge to be added to the
// registry.
const int64Gauge = metricRegistry.addDerivedInt64Gauge(
  "request/count",
  "The total number of requests",
  MeasureUnit.UNIT,
  labelKeys
);

// the value of a single point in the TimeSeries is observed from a map
// collection (SizeAttributeInterface)
const map = new Map();
int64Gauge.createTimeSeries(labelValues, map);

// sets value
map.set('key', 'value');
