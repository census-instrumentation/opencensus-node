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

### Using Stackdriver Exporter

To use Stackdriver as your exporter, make sure you have enabled [Stackdriver Tracing](https://cloud.google.com/trace/docs/quickstart) on Google Cloud Platform. Enable your [Application Default Credentials](https://cloud.google.com/docs/authentication/getting-started) for authentication with:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credential.json
```

In your code, instanciate a Stackdriver Exporter and pass it to `tracing.start()`.

```javascript
var stackdriver = require('@opencensus/exporter-stackdriver');

// Add your project id to the Stackdriver options
exporter = new stackdriver.StackdriverTraceExporter({projectId: "your-project-id"});

tracing.start({'exporter': exporter});
```

### Using Zipkin Exporter

To use Zipkin as your exporter, first, download from any of the three available options on [Quickstart](https://zipkin.io/pages/quickstart.html): through Docker, on Java or manually compiling the source code. Tests were executed running Zipkin with Java, through the following commands on terminal:

```bash
    wget -O zipkin.jar 'https://search.maven.org/remote_content?g=io.zipkin.java&a=zipkin-server&v=LATEST&c=exec'
    java -jar zipkin.jar
```

In your code, instanciate a Zipkin Exporter and pass it to `tracing.start()`.

```javascript
var zipkin = require('@opencensus/exporter-zipkin');

// Add your zipkin url and service name to the Zipkin options
var options = {
  url: 'your-zipkin-url',
  serviceName: 'your-service-name'
}
var exporter = new zipkin.ZipkinTraceExporter(options);

tracing.start({'exporter': exporter});
```

## Running the Instrumented Application

Run the application with:

```bash
node server.js
```

Go to `http://localhost:8080` to make a request or use a REST Application to do so.

Now, just go to the service used to send the traces and see the requests you just made.
