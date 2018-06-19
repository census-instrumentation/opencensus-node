# OpenCensus Instana Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Instana Exporter allows the user to send collected traces with [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node) to [Instana](https://www.instana.com/).

This project is still at an early stage of development. It's subject to change.

## Installation

Install OpenCensus Instana Exporter with:
```bash
npm install @opencensus/nodejs
npm install @opencensus/exporter-instana
```

## Usage
To use Instana as your exporter, first ensure that you have an [Instana agent running on your system](https://docs.instana.io/quick_start/getting_started/) and reporting to your environment. The Instana OpenCensus exporter directly communicates with the Instana agent in order to transmit data to Instana. 

```javascript
var tracing = require('@opencensus/nodejs');
var instana = require('@opencensus/exporter-instana');

tracing.start({
  exporter: new instana.InstanaTraceExporter()
});
```

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
