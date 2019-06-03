# OpenCensus Object Exporter
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Object Trace Exporter allows the user to collect and
programmatically access traces with [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node). This module is useful for when you need
to access collected spans programmatically, for example for testing purposes.

## Installation

Install OpenCensus Object Trace Exporter with:

```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-object
```

## Usage

For javascript:

```javascript
const tracing = require('@opencensus/nodejs');
const { ObjectTraceExporter } = require('@opencensus/exporter-object');

const exporter = new ObjectTraceExporter();
```

Similarly for Typescript:

```typescript
import * as tracing from '@opencensus/nodejs';
import { ObjectTraceExporter } from '@opencensus/exporter-object';
const exporter = new ObjectTraceExporter();
```

Now, register the exporter and start tracing.

```javascript
tracing.start({'exporter': exporter});
```

or

```javascript
tracing.registerExporter(exporter).start();
```

## Viewing your traces

```javascript
exporter.startedSpans.forEach((span: Span)) => {}
exporter.endedSpans.forEach((span: Span)) => {}
exporter.publishedSpans.forEach((span: Span)) => {}
```

## Reset exporter

Empties `startedSpans`, `endedSpans` and `publishedSpans` span stores.

```javascript
exporter.reset();
```

## Useful links

- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
