# OpenCensus Stackdriver Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Stackdriver Exporter allows the user to send collected traces with [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node) and stats with [OpenCensus Core](https://github.com/census-instrumentation/opencensus-core) to Stackdriver Cloud Tracing and Stackdriver Monitoring.

The library is in alpha stage and the API is subject to change.

# OpenCensus Stackdriver Trace Exporter
## Installation

Install OpenCensus Stackdriver Exporter with:
```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-stackdriver
```

## Usage

To use Stackdriver as your exporter, make sure you have enabled [Stackdriver Tracing](https://cloud.google.com/trace/docs/quickstart) on Google Cloud Platform. Enable your [Application Default Credentials](https://cloud.google.com/docs/authentication/getting-started) for authentication with:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credential.json
```

Create and register the exporter on your application and pass your Project ID.

For Javascript:
```javascript
const tracing = require('@opencensus/nodejs');
const { StackdriverTraceExporter } = require('@opencensus/exporter-stackdriver');

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
```

Now, register the exporter and start tracing.

```javascript
tracing.start({'exporter': exporter});
```

or

```javascript
tracing.registerExporter(exporter).start();
```

Viewing your traces:

With the above you should now be able to navigate to the Stackdriver UI at: <https://console.cloud.google.com/traces/traces>

# OpenCensus Stackdriver Stats(Metrics) Exporter
## Installation

Install OpenCensus Stackdriver Exporter with:
```bash
npm install @opencensus/core
npm install @opencensus/exporter-stackdriver
```

## Usage

To use Stackdriver as your exporter, make sure you have enabled [Stackdriver Monitoring](https://cloud.google.com/monitoring/docs/quickstart) on Google Cloud Platform. Enable your [Application Default Credentials](https://cloud.google.com/docs/authentication/getting-started) for authentication with:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credential.json
```

Create and register the exporter on your application.

For Javascript:
```javascript
const { globalStats } = require('@opencensus/core');
const { StackdriverStatsExporter } = require('@opencensus/exporter-stackdriver');

// Add your project id to the Stackdriver options
const exporter = new StackdriverStatsExporter({ projectId: "your-project-id" });

// Pass the created exporter to Stats
globalStats.registerExporter(exporter);
```

Similarly for TypeScript:
```typescript
import { globalStats } from '@opencensus/core';
import { StackdriverStatsExporter } from '@opencensus/exporter-stackdriver';

// Add your project id to the Stackdriver options
const exporter = new StackdriverStatsExporter({ projectId: "your-project-id" });

// Pass the created exporter to Stats
globalStats.registerExporter(exporter);
```

Viewing your metrics:

With the above you should now be able to navigate to the Stackdriver UI at: <https://console.cloud.google.com/monitoring>


## Useful links
- To know more about Stackdriver, visit: <https://cloud.google.com/docs/authentication/getting-started>
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
