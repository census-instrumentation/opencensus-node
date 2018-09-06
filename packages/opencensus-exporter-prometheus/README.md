# OpenCensus Prometheus Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

The OpenCensus Prometheus Exporter allows the user to send collected stats with [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node) to Prometheus.

This package is still at an early stage of development, and is subject to change.

## Installation

Install OpenCensus Prometheus Exporter with:
```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-prometheus
```

## Usage

Instance the exporter on your application. For javascript:

```javascript
var tracing = require('@opencensus/nodejs');
var prometheus = require('@opencensus/exporter-prometheus');

var exporter = new prometheus.PrometheusTraceExporter();

tracing.registerExporter(exporter).start();
```

Similarly for Typescript:

```typescript
import * as tracing from '@opencensus/nodejs';
import { PrometheusTraceExporter } from '@opencensus/exporter-prometheus';

const exporter = new PrometheusTraceExporter();
```

Now, register the exporter and start tracing.

```javascript
tracing.start({'exporter': exporter});
```

or

```javascript
tracing.registerExporter(exporter).start();
```

## Useful links
- To learn more about Prometheus, visit: <https://prometheus.io/>
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
