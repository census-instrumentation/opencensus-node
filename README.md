# OpenCensus Libraries for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Node.js is an implementation of OpenCensus, a toolkit for collecting application performance and behavior monitoring data. Right now OpenCensus for Node.js supports custom tracing and automatic tracing for http and mongodb.

The library is in alpha stage and the API is subject to change.

Please join [gitter](https://gitter.im/census-instrumentation/Lobby) for help or feedback on this project.

Note: This code was tested on the following Node versions:
- v6.10.0 (for console exporter only)
- v9.8.0 (for Stackdriver and Zipkin exporters)

___

## OpenCensus Setup

1. Clone the OpenCensus Node repository < https://github.com/census-instrumentation/opencensus-node.git>
```bash
git clone https://github.com/census-instrumentation/opencensus-node.git
```

**TODO Ver com Fábio se o usuário terá que compilar**

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

## Instrumenting an Application

Navigate to your application folder. Inside it's `node_modules` folder, create a directory named `@opencensus`:
```
cd node_modules
mkdir @opencensus
```

Navigate to your new `@opencensus` folder and create a symlink to OpenCensus Node package with:
```bash
cd @opencensus
ln -s <path-to-opencensus-dir>/packages/opencensus-nodejs/ opencensus-nodejs
```

### Using Stackdriver Exporter

To use Stackdriver as your exporter, make sure you have enabled [Stackdriver Tracing](https://cloud.google.com/trace/docs/quickstart) on Google Cloud Platform. Enable your [Application Default Credentials](https://cloud.google.com/docs/authentication/getting-started) for authentication with:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credential.json
```

Add the OpenCensus Stackdriver Exporter package to your project's `node_modules/@opencensus` folder with:
```
cd node_modules/@opencensus
ln -s <path-to-opencensus-dir>/packages/opencensus-exporter-stackdriver/ opencensus-exporter-stackdriver
```

Finally, on top of your application, add the following lines of code:
```javascript
var tracing = require('@opencensus/opencensus-nodejs');
var stackdriver = require('@opencensus/opencensus-exporter-stackdriver');

// Add your project id to the Stackdriver options
var options = new stackdriver.StackdriverOptions('your-project-id');
var exporter = new stackdriver.Stackdriver(options);

tracing.registerExporter(exporter).start();
```

### Using Zipkin Exporter

To use Zipkin as your exporter, first, download from any of the three available options on [Quickstart](https://zipkin.io/pages/quickstart.html): through Docker, on Java or manually compiling the source code. Tests were executed running Zipkin with Java, through the following commands on terminal:
```bash
wget -O zipkin.jar 'https://search.maven.org/remote_content?g=io.zipkin.java&a=zipkin-server&v=LATEST&c=exec'
java -jar zipkin.jar
```

Add the OpenCensus Zipkin Exporter package to your project's `node_modules/@opencensus` folder with:
```
cd node_modules/@opencensus
ln -s <path-to-opencensus-dir>/packages/opencensus-exporter-zipkin/ opencensus-exporter-zipkin
```

Finally, on top of your application, add the following lines of code:
```javascript
var tracing = require('@opencensus/opencensus-nodejs');
var zipkin = require('@opencensus/opencensus-exporter-zipkin');

// Add your zipkin url and application name to the Zipkin options
var options = new zipkin.ZipkinOptions("your-zipkin-url", "your-application-name")
var exporter = new zipkin.Zipkin(options);

tracing.registerExporter(exporter).start();
```

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
