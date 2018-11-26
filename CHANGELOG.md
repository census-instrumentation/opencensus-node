# Changelog

All notable changes to this project will be documented in this file.

## Unreleased
- Enforce `--noUnusedLocals` Compiler Options on opencensus-core package.
- Fix bugs related to Stackdriver Metrics Descriptor and TimeSeries.
- Add Resource API.
- Add Metrics API.

## 0.0.7 - 2018-11-12
 **Contains API breaking changes for stats/metrics implementations**

- The histogram bucket boundaries (BucketBoundaries) and values (Count and Sum) are no longer     supported for negative values. The Record API drops the negative value and logs the warning.    This could be a breaking change if you are recording negative value for any measure.
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
