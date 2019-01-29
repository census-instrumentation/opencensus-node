# Changelog

All notable changes to this project will be documented in this file.

## Unreleased
- Add Metrics API.
- Add Resource API.
- Add Tags API.
- Add Gauges (`DoubleGauge`, `LongGauge`, `DerivedDoubleGauge`, `DerivedLongGauge`) APIs.
- Add support for supplying instrumentation configuration via tracing option. Option argument added to instrumentation interface.
- Add ignoreIncomingPaths and ignoreOutgoingUrls support to the http and https tracing instrumentations.
- Add ```opencensus-resource-util``` to auto detect AWS, GCE and Kubernetes(K8S) monitored resource, based on the environment where the application is running.

 **This release has multiple breaking changes. Please test your code accordingly after upgrading.**

- Modify `Logger` interface: `level` made optional, `silly` removed.
- The ```new Stats()``` has been deprecated on Stats class. The global singleton ```globalStats``` object should be used instead. Also, ```registerView()``` is separated out from ```createView()```.
- Use ```TagKey```, ```TagValue``` and ```TagMap``` to create the tag keys, tag values.

##### Old code
```js
const { Stats } = require("@opencensus/core");
const stats = new Stats();

// Counts/groups the lengths of lines read in.
const mLineLengths = stats.createMeasureInt64(
  "demo/line_lengths",
  MeasureUnit.BYTE,
  "The distribution of line lengths"
);

// Create tag keys
const tagKeys = ["method", "status"];

// Create and register the view
stats.createView(
  "demo/lines_in",
  mLineLengths,
  AggregationType.COUNT,
  tagKeys,
  "The number of lines from standard input"
);

// Records measurements
stats.record({
  measure: mLineLengths,
  tags,
  value: 2
});

```

##### New code
```js
// Gets the global stats instance
const { globalStats } = require("@opencensus/core");

// Counts/groups the lengths of lines read in.
const mLineLengths = globalStats.createMeasureInt64(
  "demo/line_lengths",
  MeasureUnit.BYTE,
  "The distribution of line lengths"
);

// Creates the method and status key
const methodKey = {name: "method"};
const statusKey = {name: "status"};

// Creates the view
const view = globalStats.createView(
  "demo/lines_in",
  mLineLengths,
  AggregationType.COUNT,
  [methodKey, statusKey],
  "The number of lines from standard input"
);

// Registers the view
globalStats.registerView(view);

// Creates tags map -> key/value pair
const tagMap = new TagMap();
tagMap.set(methodKey, {value: 'REPL'});
tagMap.set(statusKey, {value: 'OK'});

// Creates measurements (measure + value)
const measurements = [{
  measure: mLineLengths,
  value: 2
}];

// Records measurement with tagMap
globalStats.record(measurements, tagMap);
```

## 0.0.8 - 2018-12-14
 **Contains API breaking changes for stats/metrics implementations**

- Enforce `--noUnusedLocals` Compiler Options on [opencensus-core] package.
- Fix bugs related to Stackdriver Metrics Descriptor and TimeSeries.
- Remove support for `min`/`max` in the stats Distribution to make it compatible with Metrics.
- Remove default prefix from [exporter-prometheus]. This could be a breaking change if you have Prometheus metrics from OpenCensus Prometheus exporter of previous versions, please point to the new metrics with no prefix instead.
- Zipkin exporter: Convert "timestamp" and "duration" to "number" type per spec.
- Exporter/Stats/Prometheus: Sanitize metric names.

## 0.0.7 - 2018-11-12
 **Contains API breaking changes for stats/metrics implementations**

- The histogram bucket boundaries (BucketBoundaries) and values (Count and Sum) are no longer
supported for negative values. The Record API drops the negative value and logs the warning. This could be a breaking change if you are recording negative value for any measure.
- Use setInterval to upload metrics to Stackdriver periodically.
- fix spanId format.

## 0.0.6 - 2018-10-25
- This release fixes bugs.
- Use object as base for local config definition [nodejs].

## 0.0.5 - 2018-10-19
 **Contains API breaking changes for stats/metrics implementations**

- Add RELEASING.md.
- Add @opencensus/opencensus-exporter-ocagent.
- Allow users to report metrics for their registered domain (using custom prefix). This could     be a breaking change if you have custom prefix without (registered) domain.
- Add 1 minute delay on record for [exporter-stackdriver].
- Add stats support to zpages exporter.
- Add a default zipkin url.
- Update depp-extend package to fix vulnerability.
- Remove redundant range min/max from distributedValues for [exporter-stackdriver].

## 0.0.4 - 2018-08-29
- This release fixes bugs and makes API changes in the core, exporter-stackdriver and             exporter-jaeger projects. Notably, the core module has added a new Stats API, and the           Stackdriver Exporter now supports exporting stats to Stackdriver Monitoring.
