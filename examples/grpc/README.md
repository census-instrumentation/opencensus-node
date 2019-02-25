# Overview

Our service takes in a payload containing bytes and capitalizes them.

Using OpenCensus Node, we can collect traces of our system and export them to the backend of our choice (we are using Stackdriver for this example), to give observability to our distributed systems.


## Installation

```sh
$ # from this directory
$ npm install
```

Setup [Stackdriver Tracing and Monitoring](https://opencensus.io/codelabs/stackdriver/#0)

## Run the Application

 - Run the server

   ```sh
   $ # from this directory
   $ node ./capitalize_server.js
   ```

 - Run the client

   ```sh
   $ # from this directory
   $ node ./capitalize_client.js
   ```

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>

## LICENSE

Apache License 2.0
