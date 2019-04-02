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
 * This is an example shows how to create a Gauge metric and manually set or
 * add value of the gauge. Gauge metric API is to report instantaneous
 * measurement of an int64/double value. Gauges can go both up and down. The
 * gauges values can be negative.
 */

const { Metrics, MeasureUnit } = require('@opencensus/core');

// [UNCOMMENT THIS BLOCK to visualize the data =======================]
// // Enable OpenCensus exporters to export gauges to Stackdriver Monitoring.
// const { StackdriverStatsExporter } = require('@opencensus/exporter-stackdriver');
// const exporter = new StackdriverStatsExporter({ projectId: 'projectId' });
// const { globalStats } = require('@opencensus/core');
// globalStats.registerExporter(exporter);
// [END setup_exporter ==============================================]

// a registry is a collection of metric objects.
const metricRegistry = Metrics.getMetricRegistry();

// application labels - applied to each metric / gauge.
const labelKeys = [{ key: 'VM', description: 'VM Description' }];
const labelValues = [{ value: 'localhost' }];

// a new gauge instance - builds a new Int64 gauge to be added to the registry.
const metricOptions = {
  description: 'The number of seconds the current Node.js process has been running',
  unit: MeasureUnit.SEC,
  labelKeys: labelKeys
};
const gauge = metricRegistry.addDoubleGauge('process_uptime', metricOptions);

// It is recommended to keep a reference of a point for manual operations.
const point = gauge.getOrCreateTimeSeries(labelValues);
point.set(process.uptime());

for (let i = 0; i < 1000000000; i++) {
  // do some work here
}

point.set(process.uptime());
