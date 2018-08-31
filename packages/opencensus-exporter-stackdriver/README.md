# OpenCensus Stackdriver Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Stackdriver Exporter allows the user to send collected traces and stats with [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node) to Stackdriver Cloud Tracing and Stackdriver Monitoring.

This project is still at an early stage of development. It's subject to change.

## Installation

Install OpenCensus Stackdriver Exporter with:
```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-stackdriver
```

## Cloud Trace Exporter

To use Stackdriver as your exporter, make sure you have enabled [Stackdriver Tracing](https://cloud.google.com/trace/docs/quickstart) on Google Cloud Platform. Enable your [Application Default Credentials](https://cloud.google.com/docs/authentication/getting-started) for authentication with:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credential.json
```

Instance the exporter on your application and pass your Project ID. For JavaScript:

```javascript
import * as tracing from '@opencensus/nodejs';
import { StackdriverTraceExporter } from '@opencensus/exporter-stackdriver';

// Add your project id to the Stackdriver options
const exporter = new StackdriverTraceExporter({projectId: "your-project-id"});

tracing.registerExporter(exporter).start();
```

Similarly for TypeScript:

```typescript
import * as tracing from '@opencensus/nodejs';
import { StackdriverTraceExporter } from '@opencensus/exporter-stackdriver';

// Add your project id to the Stackdriver options
const exporter = new StackdriverTraceExporter({projectId: "your-project-id"});

tracing.registerExporter(exporter).start();
```

Now, register the exporter and start tracing.

```javascript
tracing.start({'exporter': exporter});
```

or

```javascript
tracing.registerExporter(exporter).start();
```

## Monitoring Exporter

To use Stackdriver as your exporter, make sure you have enabled [Stackdriver Monitoring](https://cloud.google.com/monitoring/docs/quickstart) on Google Cloud Platform. Enable your [Application Default Credentials](https://cloud.google.com/docs/authentication/getting-started) for authentication with:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credential.json
```

Instance the exporter on your application passing your Project ID and register your exporter on Stats. For JavaScript:

```javascript
import { Stats } from '@opencensus/core';
import { StackdriverStatsExporter } from '@opencensus/exporter-stackdriver';

// Add your project id to the Stackdriver options
const exporter = new StackdriverStatsExporter({projectId: "your-project-id"});

// Pass the created exporter to Stats
const stats = new Stats();
stats.registerExporter(exporter);
```

Similarly for TypeScript:

```typescript
import { Stats } from '@opencensus/core';
import { StackdriverStatsExporter } from '@opencensus/exporter-stackdriver';

// Add your project id to the Stackdriver options
const exporter = new StackdriverStatsExporter({projectId: "your-project-id"});

// Pass the created exporter to Stats
const stats = new Stats();
stats.registerExporter(exporter);
```

## Useful links
- To know more about Stackdriver, visit: <https://cloud.google.com/docs/authentication/getting-started>
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
