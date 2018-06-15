# OpenCensus Zipkin Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Zipkin Exporter allows the user to send collected traces with [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node) to Zipkin.

This project is still at an early stage of development. It's subject to change.

## Installation

Install OpenCensus Zipkin Exporter with:
```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-zipkin
```

## Usage

To use Zipkin as your exporter, first, download from any of the three available options on [Quickstart](https://zipkin.io/pages/quickstart.html): through Docker, on Java or manually compiling the source code. Tests were executed running Zipkin with Java, through the following commands on terminal:

```bash
wget -O zipkin.jar 'https://search.maven.org/remote_content?g=io.zipkin.java&a=zipkin-server&v=LATEST&c=exec'
java -jar zipkin.jar
```

Instance the exporter on your application and pass the options. For javascript:

```javascript
var tracing = require('@opencensus/nodejs');
var zipkin = require('@opencensus/exporter-zipkin');

// Add your zipkin url and application name to the Zipkin options
var options = {
  url: 'your-zipkin-url',
  serviceName: 'your-application-name'
}
var exporter = new zipkin.Zipkin(options);
```

Similarly for Typescript:

```typescript
import * as tracing from '@opencensus/nodejs';
import { Zipkin } from '@opencensus/exporter-zipkin';

// Add your zipkin url and application name to the Zipkin options
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

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
