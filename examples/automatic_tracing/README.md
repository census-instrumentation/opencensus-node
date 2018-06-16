# OpenCensus Node.js Automatic Tracing

In this example we'll build a simple http server that returns `Hello World`. We're also going to instrument it using OpenCensus, to be able to collect traces and send them to different services.

## Installing OpenCensus

Install OpenCensus with:

```bash
npm install @opencensus/nodejs
```

## Instrumenting the Application

OpenCensus is able to automatically trace HTTP requests, therefore, you just need to require OpenCensus in your application with:

```javascript
var tracing = require('@opencensus/nodejs');
tracing.start();

var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('Hello World!');
    res.end();
}).listen(8080);
```

### Using Exporters

OpenCensus is vendor-agnostic and can upload data to any backend with various exporter implementations. Even though, OpenCensus provides support for many backends, users can also implement their own exporters for proprietary and unofficially supported backends. Refer to the `README.md` of the [exporters](https://github.com/census-instrumentation/opencensus-node/blob/master/README.md#exporters) to learn more.

## Running the Instrumented Application

Run the application with:

```bash
node server.js
```

Go to `http://localhost:8080` to make a request or use a REST Application to do so.

Now, just go to the service used to send the traces and see the requests you just made.
