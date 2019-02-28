# Overview

OpenCensus HTTP Instrumentation allows the user to automatically collect trace data and export them to the backend of choice (we are using Zipkin for this example), to give observability to distributed systems.

## Installation

```sh
$ # from this directory
$ npm install
```

Setup [Zipkin Tracing](https://opencensus.io/codelabs/zipkin/#0)

## Run the Application

 - Run the server

   ```sh
   $ # from this directory
   $ node ./server.js
   ```

 - Run the client

   ```sh
   $ # from this directory
   $ node ./client.js
   ```

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>

## LICENSE

Apache License 2.0
