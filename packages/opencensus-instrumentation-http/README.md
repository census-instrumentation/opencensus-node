# OpenCensus HTTP Instrumentation for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus HTTP Instrumentation allows the user to automatically collect trace data. This package is used by [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node/tree/master/packages/opencensus-nodejs) to instrument HTTP for both servers and clients.

This project is still at an early stage of development. It's subject to change.

## Installation

Install the opencensus-instrumentation-http package with NPM:
```bash
npm install @opencensus/instrumentation-http
```

## Usage

#### Let's create HTTP server!
We'll need to require the ```http``` module and bind our server to the port 3000 to listen on.

```javascript
// content of index.js
const http = require('http');
const port = 3000;

// A function which handles requests and send response
const requestHandler = (request, response) => {
  console.log(request.url);
  response.end('Hello Node.js Server!');
}

// Creates a server
const server = http.createServer(requestHandler);

// Starts the server !
server.listen(port, (err) => {
  if (err) {
    throw err;
  }

  console.log(`Node HTTP listening on ${port}`);
});
```

#### Now, set up a HTTP Instrumentation.
Now that we have our app working, let’s actually add the HTTP Trace instrumentation.

```javascript
const { plugin } = require('@opencensus/instrumentation-http');
const { CoreTracer } = require('@opencensus/core');

// 1. Define node version
const version = process.versions.node;

// 2. Setup Tracer
const tracer = new CoreTracer();
tracer.start({samplingRate: 1}); // always sampler

// 3. Enable HTTP plugin
plugin.enable(http, tracer, version, null);
```

The instrumented handler creates a trace automatically for each request that is received. We shall need a ```Trace exporter```, allowing us to examine the traces.

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
