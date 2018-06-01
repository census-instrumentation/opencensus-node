# OpenCensus Stackdriver Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Stackdriver Exporter allows the user to send collected traces with [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node) to Stackdriver.

This project is still at an early stage of development. It's subject to change.

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

Instance the exporter on your application and pass your Project ID. For javascript:

```javascript
var tracing = require('@opencensus/nodejs');
var stackdriver = require('@opencensus/exporter-stackdriver');

// Add your project id to the Stackdriver options
var exporter = new stackdriver.StackdriverTraceExporter({projectId: "your-project-id"});

tracing.registerExporter(exporter).start();
```

Similarly for Typescript:

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

## Useful links
- To know more about Stackdriver, visit: <https://cloud.google.com/docs/authentication/getting-started>
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
