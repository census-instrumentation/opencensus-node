# OpenCensus Agent Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Agent Exporter allows the user to send collected traces with OpenCensus Node.js to the OpenCensus Agent or Collector.

This project is still at an early stage of development, it's subject to change.

## Installation

Install OpenCensus Agent Exporter with:
```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-ocagent
```

## Usage

Instance the exporter on your application. For javascript:

```javascript
var tracing = require('@opencensus/nodejs');
var ocagent = require('@opencensus/exporter-ocagent');

var exporter = new ocagent.OCAgentExporter({
  // ... configuration options ...
});

tracing.registerExporter(exporter).start();
```

Similarly for Typescript:

```typescript
import * as tracing from '@opencensus/nodejs';
import { OCAgentExporter } from '@opencensus/exporter-ocagent';

const exporter = new OCAgentExporter({
  // ... configuration options ...
});
```

Now, register the exporter and start tracing.

```javascript
tracing.start({exporter: exporter});
```

or

```javascript
tracing.registerExporter(exporter).start();
```

## Configuration Options

The following options are available through the construtor options.

Option          | Type                    | Description 
----------------|-------------------------|-
`serviceName`   | string                  | Name of the service. Defaults to `Anonymous Service`.
`host`          | string                  | Host or ip of the agent. Defaults to `localhost`.
`port`          | number                  | Port of the agent. Defaults to `55678`.
`credentials`   | grpc.ChannelCredentials | Credentials to use for grpc connection to agent. Defaults to `grpc.credentials.createInsecure()`.
`attributes`    | {[key: string]: string} | Map of key-value pairs to associate with the Node.
`bufferSize`    | number                  | Maximum size of the span buffer.
`bufferTimeout` | number                  | Max time (in milliseconds) for the buffer can wait before exporting spans.
`logger`        | Logger                  | Logger to use for output.

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
