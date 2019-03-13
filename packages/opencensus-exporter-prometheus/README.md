# OpenCensus Prometheus Stats Exporter
[![Gitter chat][gitter-image]][gitter-url] ![Node Version][node-img] [![NPM Published Version][npm-img]][npm-url] ![dependencies Status][dependencies-status] ![devDependencies Status][devdependencies-status] ![Apache License][license-image]

The OpenCensus Prometheus Stats Exporter allows the user to send collected stats with [OpenCensus Core](https://github.com/census-instrumentation/opencensus-core) to Prometheus.

[Prometheus](https://prometheus.io/) is a monitoring system that collects metrics, by scraping exposed endpoints at regular intervals, evaluating rule expressions. It can also trigger alerts if certain conditions are met. For assistance setting up Prometheus, [Click here](https://opencensus.io/codelabs/prometheus/#0) for a guided codelab.

This package is still at an early stage of development, and is subject to change.

## Installation

Install OpenCensus Prometheus Exporter with:
```bash
npm install @opencensus/core
npm install @opencensus/exporter-prometheus
```

## Usage

Create & register the exporter on your application.

For Javascript:
```javascript
const { globalStats } = require('@opencensus/core');
const { PrometheusStatsExporter } = require('@opencensus/exporter-prometheus');

// Add your port and startServer to the Prometheus options
const exporter = new PrometheusStatsExporter({
  port: 9464,
  startServer: true
});
```

Now, register the exporter.

```javascript
// Pass the created exporter to Stats
globalStats.registerExporter(exporter);
```

Similarly for TypeScript (Since the source is written in TypeScript):
```typescript
import { PrometheusStatsExporter } from '@opencensus/exporter-prometheus';
import { globalStats } from '@opencensus/core';

// Add your port and startServer to the Prometheus options
const options = {port: 9464, startServer: true};
const exporter = new PrometheusStatsExporter(options);

// Pass the created exporter to Stats
globalStats.registerExporter(exporter);
```

Viewing your metrics:

With the above you should now be able to navigate to the Prometheus UI at: <http://localhost:9464/metrics>

## Useful links
- To learn more about Prometheus, visit: <https://prometheus.io/>
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
[npm-url]: https://www.npmjs.com/package/@opencensus/exporter-prometheus
[npm-img]: https://badge.fury.io/js/%40opencensus%2Fexporter-prometheus.svg
[node-img]: https://img.shields.io/node/v/@opencensus/exporter-prometheus.svg
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[dependencies-status]: https://david-dm.org/census-instrumentation/opencensus-node/status.svg?path=packages/opencensus-exporter-prometheus
[devdependencies-status]:
https://david-dm.org/census-instrumentation/opencensus-node/dev-status.svg?path=packages/opencensus-exporter-prometheus

## LICENSE

Apache License 2.0
