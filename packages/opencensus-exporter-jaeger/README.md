# OpenCensus Jaeger Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Jaeger Exporter allows the user to send collected traces with OpenCensus Node.js to Jaeger.

This project is still at an early stage of development. It's subject to change.

## Installation

Install OpenCensus Jaeger Exporter with:
```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-jaeger
```

## Usage

Instance the exporter on your application and pass the options, it must contain a service name and, optionaly, an URL. If no URL is passed, `http://localhost:9411/api/v2/spans` is used as default.

For ES6:

```javascript
import tracing from '@opencensus/nodejs';
import { JaegerTraceExporter } from '@opencensus/exporter-jaeger';

const options = {
  serviceName: 'my-service';
  tags: []; // optional
  host: localhost; // optional
  port: 6832; // optional
  maxPacketSize: 65000; // optional
}
const exporter = new JaegerTraceExporter(options);
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
- To know more about Jaeger, visit: <https://www.jaegertracing.io/docs/1.8/getting-started/>
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
