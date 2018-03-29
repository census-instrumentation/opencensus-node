# OpenCensus Node.js Example


Note: This code was tested on the following Node versions:
- v6.10.0 (for console exporter only)
- v9.8.0 (for Stackdriver and Zipkin exporters)

___

## Setup

1. Clone the OpenCensus Node repository **TODO link to repository**
<>

2. Switch to branch `dev` with:
```bash
git checkout dev
```

3. Navigate to the OpenCensus Node project folder and install the dependencies with:
```bash
npm install
```

4. Compile the TypeScript code into JavaScript with:
```
node_modules/.bin/tsc
```

5. Clone the application we will instrument (EasyNotes Application)
<https://github.com/callicoder/node-easy-notes-app>

6. Navigate to the application folder and install the dependencies with:
```bash
npm install
```

7. Navigate to the `node_modules` folder inside the EasyNotes application and create a link to OpenCensus Node project folder with:
```bash
ln -s <your path>/opencensus-node/build/src  opencensus-nodejs
```


## Instrument using Stackdriver

1. Make sure you enabled Stackdriver Tracing on Google Cloud Platform. More info at <https://cloud.google.com/trace/docs/quickstart>

2. Enable Application Default Credentials for authentication with:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credential.json
```
More information at <https://cloud.google.com/docs/authentication/getting-started>

3. Open the `server.js` file in the EasyNotes application and insert this code on top:
```javascript
var traceMng = require("opencensus-nodejs")
               .addStackdriver("your-project-id")
               .start();
```

## Instrument using Zipkin

1. Download Zipkin choosing one of the three available options on [Quickstart](https://zipkin.io/pages/quickstart.html): through Docker, on Java or manually compiling the source code. Tests were executed running Zipkin with Java, through the following commands on terminal:
```bash
    wget -O zipkin.jar 'https://search.maven.org/remote_content?g=io.zipkin.java&a=zipkin-server&v=LATEST&c=exec'
    java -jar zipkin.jar
```

2. Open the `server.js` file in the EasyNotes application and insert this code on top:
```javascript
var tracing = require("opencensus-nodejs")
              .addZipkin("http://localhost:9411/api/v2/spans", "easy-notes")
              .start()
```

## Instrumenting with multiple Exporters

It is possible to instrument with more than one code. To achieve this, simply add more than one Exporter in series.

```javascript
var tracing = require("opencensus-nodejs")
              .addZipkin(“http://localhost:9411/api/v2/spans“, "easy-notes")
              .addStackdriver("your-project")
              .start()
```

## Running the Instrumented Application

It is possible both to run with debugging information and without it. To run with debugging information use:
```bash
DEBUG=opencensus node server.js
```
To run without debugging information, simply use:
```bash
node server.js
```
