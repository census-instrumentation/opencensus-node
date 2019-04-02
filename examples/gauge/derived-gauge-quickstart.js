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
 * This is an example shows how to create a Derived Gauge metric. This gauge is
 * self sufficient once created
 */

const { Metrics, MeasureUnit } = require('@opencensus/core');

// [UNCOMMENT THIS BLOCK to visualize the data =======================]
// // Enable OpenCensus exporters to export gauges to Stackdriver Monitoring.
// const { StackdriverStatsExporter } = require('@opencensus/exporter-stackdriver');
// const exporter = new StackdriverStatsExporter({ projectId: 'projectId' });
// const { globalStats } = require('@opencensus/core');
// globalStats.registerExporter(exporter);
// [END setup_exporter ==============================================]

// To instrument a queue's depth.
class QueueManager {
  constructor () { this.depth = 0; }
  getValue () { return this.depth; }
  addJob () { this.depth++; }
}

// a registry is a collection of metric objects.
const metricRegistry = Metrics.getMetricRegistry();

// application labels - applied to each metric / gauge.
const labelKeys = [{ key: 'VM', description: 'VM Description' }];
const labelValues = [{ value: 'localhost' }];

// a new gauge instance - builds a new Int64 gauge to be added to the registry.
const metricOptions = {
  description: 'Number of active handles',
  unit: MeasureUnit.UNIT,
  labelKeys: labelKeys
};
const gauge = metricRegistry.addDerivedInt64Gauge('active_handles_total', metricOptions);

const queue = new QueueManager();
queue.addJob();

// The value of the gauge is observed from the obj whenever metrics are
// collected. In this case it will be 1.
gauge.createTimeSeries(labelValues, queue);
