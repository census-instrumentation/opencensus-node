# OpenCensus Zipkin Trace Exporter
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Zipkin Trace Exporter allows the user to send collected traces with [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node) to Zipkin.

[Zipkin](https://zipkin.io/) is a distributed
tracing system. It helps gather timing data needed to troubleshoot
latency problems in microservice architectures. It manages both the
collection and lookup of this data.

The library is in alpha stage and the API is subject to change.

## Installation

Install OpenCensus Zipkin Exporter with:
```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-zipkin
```

## Usage

To use [Zipkin](https://zipkin.io/) as your exporter, first, download from any of the three available options on [Quickstart](https://zipkin.io/pages/quickstart.html): through Docker, on Java or manually compiling the source code. Tests were executed running Zipkin with Java, through the following commands on terminal:

```bash
curl -sSL https://zipkin.io/quickstart.sh | bash -s
java -jar zipkin.jar
```

Instance the exporter on your application and pass the options, it must contain a service name and, optionaly, an URL. If no URL is passed, `http://localhost:9411/api/v2/spans` is used as default.

For javascript:

```javascript
const tracing = require('@opencensus/nodejs');
const zipkin = require('@opencensus/exporter-zipkin');

// Add your zipkin url (ex http://localhost:9411/api/v2/spans)
// and application name to the Zipkin options
const options = {
  url: 'your-zipkin-url',
  serviceName: 'your-application-name'
}
const exporter = new zipkin.ZipkinTraceExporter(options);
```

Similarly for Typescript:

```typescript
import * as tracing from '@opencensus/nodejs';
import { Zipkin } from '@opencensus/exporter-zipkin';

// Add your zipkin url (ex http://localhost:9411/api/v2/spans)
// and application name to the Zipkin options
const options = {
  url: 'your-zipkin-url',
  serviceName: 'your-application-name'
}
const exporter = new Zipkin(options);
```

Now, register the exporter and start tracing.

```javascript
tracing.start({'exporter': exporter});
```

or

```javascript
tracing.registerExporter(exporter).start();
```
## Viewing your traces:
Please visit the Zipkin UI endpoint http://localhost:9411

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For Zipkin project at https://zipkin.io/
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
