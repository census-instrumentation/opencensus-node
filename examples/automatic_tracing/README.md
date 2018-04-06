# OpenCensus Node.js Automatic Tracing


Note: This code was tested on the following Node versions:
- v6.10.0 (for console exporter only)
- v9.8.0 (for Stackdriver and Zipkin exporters)

___

In this example we'll build a simple http server that can return `Hello World`. We're also going to instrument it using OpenCensus, to be able to collect traces and send them to different services.

## OpenCensus Setup

1. Clone the OpenCensus Node repository < https://github.com/census-instrumentation/opencensus-node.git>
```bash
git clone https://github.com/census-instrumentation/opencensus-node.git
```

2. Switch to branch `dev` with:
```bash
git checkout dev
```

3. Navigate to the OpenCensus Node project folder and install the dependencies with:
```bash
cd opencensus-node
npm install
```

4. Compile the TypeScript code into JavaScript with:
```
node_modules/.bin/tsc
```

___

## Instrumented Application Setup

1. Navigate to the `automatic_tracing` folder with:
```
cd examples/automatic_tracing
```

2. Create a folder named `node_modules` and make a symlink inside of it, running the following command:
```
cd node_modules
ln -s <opencensus-node-dir>/build/src opencensus-nodejs
```

### Using Stackdriver Exporter

To use Stackdriver as your exporter, make sure you have enabled [Stackdriver Tracing](https://cloud.google.com/trace/docs/quickstart) on Google Cloud Platform. Enable your [Application Default Credentials](https://cloud.google.com/docs/authentication/getting-started) for authentication with:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credential.json
```

Open the `stackdriver.js` file and, in the `.addStackdriver()` method, pass your Project ID as follows:
```javascript
var tracing = require('opencensus-nodejs').addStackdriver('your-project-id').start();
```

### Using Zipkin Exporter

To use Zipkin as your exporter, first, download from any of the three available options on [Quickstart](https://zipkin.io/pages/quickstart.html): through Docker, on Java or manually compiling the source code. Tests were executed running Zipkin with Java, through the following commands on terminal:
```bash
    wget -O zipkin.jar 'https://search.maven.org/remote_content?g=io.zipkin.java&a=zipkin-server&v=LATEST&c=exec'
    java -jar zipkin.jar
```

Open the `zipkin.js` file and , in the `.addZipkin()` method, pass your *URL* and *service name* as follows:
```javascript
var tracing = require('opencensus-nodejs').addZipkin('http://localhost:9411/api/v2/spans', 'service_name');
```

___

## Running the Instrumented Application

It is possible to run the application both with or without debugging information. To run with debugging information use:
```bash
DEBUG=opencensus node server.js
```

To run without debugging information, simply use:
```bash
node server.js
```

Go to `http://localhost:8080` to make a request or use a REST Application to do so.

Now, just go to the service used to send the traces and see the requests you just made.
