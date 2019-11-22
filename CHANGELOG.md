# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

## 0.0.19 - 2019-11-22
- fix: fallback to global resource type when expected labels are missing (#711)
- chore(deps): update dependency rimraf to v3 (#700)
- add typedoc docs (#583)
- chore: audit fix (#710)
- fix(deps): update dependency jaeger-client to ~3.17.0 (#697)
- chore: upgrade gcp-metadata to ^3.0.0 (#709)

## 0.0.18 - 2019-10-09
- Fix a TypeError of url.parse (#640)
- Map http attributes to the stackdriver format
- Fix: silently ignore the invalid keys and values (#664)
- Fix propagation breaking for https.get (#657)
- Update dependency jaeger-client to ~3.16.0 (#656)
- Fix the problem caused by multiple http2.connect calls (#650)

## 0.0.17 - 2019-09-03
- fix: allow override global trace params limits (#643)
- npm audit fix (#645)
- Use Zipkin quickstart script in download instructions (#635)
- Use HTTPS links in Zipkin exporter README (#636)

## 0.0.16 - 2019-07-20
- Feat, make `tracer` property available on spans.
- fix(span): make child span clock relative to root span (#628)
- chore(deps): bump lodash from 4.17.11 to 4.17.13 (#619)
- chore(deps): bump lodash in /packages/opencensus-instrumentation-http (#624)
- chore(deps): bump lodash in /packages/opencensus-exporter-zpages (#627)
- chore(deps): bump lodash in /packages/opencensus-propagation-stackdriver (#621)
- chore(deps): bump lodash in /packages/opencensus-nodejs (#620)
- chore(deps): bump lodash in /packages/opencensus-exporter-zipkin (#626)
- chore(deps): bump lodash in /packages/opencensus-exporter-stackdriver (#625)
- chore(deps): bump lodash in /packages/opencensus-instrumentation-https (#623)
- chore(deps): bump lodash in /packages/opencensus-propagation-b3 (#622)
- chore(deps): bump lodash in /packages/opencensus-core (#618)
- chore(deps): bump lodash.template from 4.4.0 to 4.5.0 (#617)

## 0.0.15 - 2019-07-09
- Update dependency codecov to 3.5 (#612)
- feat(nodejs-base): do not hook require when not necessary (#585)
- Update dependency google-auth-library and googleapis (#579)
- Update dependency gts to v1 (#578)
- Add Express example (#577)
- License header fix: replace gRPC:// with https:// (#576)
- Upgrade gts to 1.0 (#572)
- fix(zipkin-exporter): fix nested child span support (#574)
- fix(deps): update dependency grpc to ~1.21.0 (#549)

## 0.0.14 - 2019-06-04
- Exporter/Stats/Stackdriver: Add support for exemplar
- exporter-stackdriver: Add support the credentials option used for authentication instead of your application default credentials
- Update dependency @types/nock to v10
- Object Trace Exporter for programatic span access
- Update dependency axios to ^0.19.0 [SECURITY]
- Refactor resource util to match specs
- Update dependency jaeger-client to ~3.15.0
- Trace Context Propagation: return null instead of empty spancontext
- Update dependency gcp-metadata to v2
- Fix duplicate spans issue and clean up
- chore(deps): update dependency nyc to v14.1.1
- chore: add node 12 ci job

## 0.0.13 - 2019-05-20
- Exporter/Stats/Prometheus: Fix missing tags for HTTP metrics
- http-instrumentation: add support for the addition of custom attributes to spans
- Set CurrentRootSpan correctly
- Chore: update GRPC to 1.12.3
- Fix: handle infinite loop caused by get traceState()
- Chore: upgrade engines field to >=8
- Chore: Fix js-yaml vulnerability from Codecov
- Change CLS import to do stats type more general

**This release has a breaking change. Please test your code accordingly after upgrading.**

- Remove Span's `startChildSpan(nameOrOptions?: string|SpanOptions, kind?: SpanKind)` interface, now only `SpanOptions` object interface is supported.

## 0.0.12 - 2019-05-13
- Add `defaultAttributes` config to `Tracer.start(config)`
- http-instrumentation: Handle incoming requests with long request url path.
- Add Cumulative (`DoubleCumulative`, `LongCumulative`, , `DerivedDoubleCumulative`, `DerivedLongCumulative`) APIs.
- Export `TracerBase` as a separate `@opencensus/nodejs-base` package.
- Fix(deps): update dependency nyc to v14.
- Fix(deps): update dependency grpc to ~1.20.0
- chore(package): update handlebar to avoid security vulnabirity.
- Move propagation-binaryformat package to dependencies.
- Fix(deps): update dependency @grpc/proto-loader to ^0.5.0
- http-instrumentation: fix propagation errors when using Expect header.
- Consolidate Span and RootSpan to allow Spans to recursively have children.

 **This release has a breaking change. Please test your code accordingly after upgrading.**

 - removing Tracer's `startChildSpan(name?: string, kind?: types.SpanKind)` interface

 ##### Old code

```js
// Multi argument interface
const span = tracer.startChildSpan('my-span', types.SpanKind.SERVER);

// Or options object interface
const span = tracer.startChildSpan({
  name: 'my-span',
  kind: types.SpanKind.SERVER
});
```

##### New code

```js
// Only options object interface is supported
const span = tracer.startChildSpan({
  name: 'my-span',
  kind: types.SpanKind.SERVER
});
```

## 0.0.11 - 2019-04-08
- Gauge: Add support for constant labels.
- Add support for Opencensus Span links to Thrift Span references.
- Add Redis and IORedis instrumentation plugins by default.
- Fix(deps): update dependency googleapis to v39.
- Fix error in Opencensus to stackdriver translation (compressedSize -> compressedSizeBytes and uncompressedSize -> uncompressedSizeBytes)
- Remove createScopedRequired usage.

## 0.0.10 - 2019-04-03
- Add optional `compressedSize` and `uncompressedSize` params to `Span.addMessageEvent`
- Add support for ```tags```, ```status``` and ```annotation``` in Zipkin exporter.
- Add support for Binary propagation format.
- Add support for object(```SpanOptions```) as an argument for ```startChildSpan``` function, similar to ```startRootSpan```.
- Add proto files to exporter-ocagent package. Fixes issue [#174](https://github.com/census-instrumentation/opencensus-node/issues/174).
- Remove `ConfigStream` behavior from exporter-ocagent. This was unstable and is not currently supported by any other language instrumentation.
- Change default exporter-ocagent port to `55678` to match the default OC Agent port.
- Add support for recording gRPC stats.
- Add support for recording HTTP stats.
- Enforce `--strictNullChecks` and `--noUnusedLocals` Compiler Options on [opencensus-instrumentation-http], [opencensus-instrumentation-grpc] and [opencensus-propagation-tracecontext] packages.
- Enforce `--strictNullChecks` and `--noUnusedLocals` Compiler Options on  [opencensus-exporter-zipkin] packages.
- Add NoRecordRootSpan, NoRecordSpan and NoRecordSpanBase.
- Enforce `--strictNullChecks` and `--noUnusedLocals` Compiler Options on [opencensus-exporter-instana] package.
- Add an API `globalStats.unregisterExporter()`.
- Add support for overriding sampling for a span.
- Enforce `--strictNullChecks` and `--noUnusedLocals` Compiler Options on [opencensus-exporter-jaeger] packages.
- Add support for recording Exemplars.
- Add `TagMetadata` that defines the properties associated with a `Tag`.
- Add HTTP/W3C text format serializer to Tag propagation component.
- Enforce `--strictNullChecks` and `--noUnusedLocals` Compiler Options on [opencensus-core] package.
- Please note that there is an API breaking change in methods `addMessageEvent()`. The field `id` is now number instead of string.
- Add support for recording exemplars.
- Add a NoRecord RootSpan and Span.
- Add support for child span count.
- Add [opencensus-instrumentation-ioredis] instrumentation plugin.
- Make Stackdriver propagation module consistent with other propagations interface.
- Add support for gRPC tags propagation.
- Use ts-mocha to run tests.
- Add `MetricOptions` to simplify all addXGauge.

## 0.0.9 - 2019-02-12
- Add Metrics API.
- Add Resource API.
- Add Tags API.
- Add Gauges (`DoubleGauge`, `LongGauge`, `DerivedDoubleGauge`, `DerivedLongGauge`) APIs.
- Add support for supplying instrumentation configuration via tracing option. Option argument added to instrumentation interface.
- Add ignoreIncomingPaths and ignoreOutgoingUrls support to the http and https tracing instrumentations.
- Add ```opencensus-resource-util``` to auto detect AWS, GCE and Kubernetes(K8S) monitored resource, based on the environment where the application is running.
- Add optional `uncompressedSize` and `compressedSize` fields to `MessageEvent` interface.
- Add a ```setStatus``` method in the Span.
- OpenCensus Stackdriver Trace Exporter is updated to use Stackdriver Trace V2 APIs.

 **This release has multiple breaking changes. Please test your code accordingly after upgrading.**

- Modify `Logger` interface: `level` made optional, `silly` removed.
- The ```new Stats()``` has been deprecated on Stats class. The global singleton ```globalStats``` object should be used instead. Also, ```registerView()``` is separated out from ```createView()```.
- Use ```TagKey```, ```TagValue``` and ```TagMap``` to create the tag keys, tag values.
- The `status` field on `Span` is no longer a number, use `CanonicalCode` instead.
- Add enum type for `MessageEvent`, `Link` and `SpanKind`, instead of string.

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
