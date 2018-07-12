# OpenCensus Prometheus Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Prometheus Exporter allows the user to send collected traces with [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node) to Prometheus.

This project is still at an early stage of development. It's subject to change.

## Installation

Install OpenCensus Prometheus Exporter with:
```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-prometheus
```

## Usage

To use Prometheus as your exporter, make sure you have enabled [Prometheus Tracing](https://cloud.google.com/trace/docs/quickstart) on Google Cloud Platform. Enable your [Application Default Credentials](https://cloud.google.com/docs/authentication/getting-started) for authentication with:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credential.json
```

Instance the exporter on your application and pass your Project ID. For javascript:

```javascript
var tracing = require('@opencensus/nodejs');
var prometheus = require('@opencensus/exporter-prometheus');

// Add your project id to the Prometheus options
var exporter = new prometheus.PrometheusTraceExporter({projectId: "your-project-id"});

tracing.registerExporter(exporter).start();
```

Similarly for Typescript:

```typescript
import * as tracing from '@opencensus/nodejs';
import { PrometheusTraceExporter } from '@opencensus/exporter-prometheus';

// Add your project id to the Prometheus options
const exporter = new PrometheusTraceExporter({projectId: "your-project-id"});
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
- To know more about Prometheus, visit: <https://cloud.google.com/docs/authentication/getting-started>
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
