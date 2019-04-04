# OpenCensus Jaeger Trace Exporter
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Jaeger Trace Exporter allows the user to send collected traces with [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node) to Jaeger.

[Jaeger](https://jaeger.readthedocs.io/en/latest/), inspired by [Dapper](https://research.google.com/pubs/pub36356.html) and [OpenZipkin](http://zipkin.io/), is a distributed tracing system released as open source by [Uber Technologies](http://uber.github.io/). It is used for monitoring and troubleshooting microservices-based distributed systems, including:

- Distributed context propagation
- Distributed transaction monitoring
- Root cause analysis
- Service dependency analysis
- Performance / latency optimization

The library is in alpha stage and the API is subject to change.

## Quickstart

### Prerequisites

[Jaeger](https://jaeger.readthedocs.io/en/latest/) stores and queries traces exported by
applications instrumented with Census. The easiest way to [start a Jaeger
server](https://jaeger.readthedocs.io/en/latest/getting_started/) is to paste the below:

```bash
docker run -d \
    -e COLLECTOR_ZIPKIN_HTTP_PORT=9411 \
    -p5775:5775/udp -p6831:6831/udp -p6832:6832/udp \
    -p5778:5778 -p16686:16686 -p14268:14268 -p9411:9411 \
  jaegertracing/all-in-one:latest
```

### Installation

Install OpenCensus Jaeger Exporter with:
```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-jaeger
```

### Usage

Install the exporter on your application and pass the options, it must contain a service name and, optionaly, an URL. If no URL is passed, `http://127.0.0.1:14268/api/traces` is used as default.

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
