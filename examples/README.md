# OpenCensus Node.js Example


Note: This code was tested on the following Node versions:
- v6.10.0 (for console exporter only)
- v9.8.0 (for Stackdriver and Zipkin exporters)

At this momment the automatic instrumetation is only for apps using http and mongo-db.

___

## Setup

1. Clone the OpenCensus Node repository https://github.com/census-instrumentation/opencensus-node.git
```bash
git clone https://github.com/census-instrumentation/opencensus-node.git
cd opencensus-node
```

2. Switch to branch `dev` with:
```bash
git checkout dev
```

3. Install the dependencies with:
```bash
npm install
```

4. Compile the TypeScript code into JavaScript with:
```
node_modules/.bin/tsc
```

5. In a different folder, clone the example application to be instrumented (EasyNotes Application)
```bash
 git clone https://github.com/callicoder/node-easy-notes-app
```

6. Navigate to the application folder and install the dependencies with:
```bash
cd node-easy-notes-app
npm install
```

7. Check if the app is running. PS.: a mongodb installation is required
```bash
$ node server.js
Server is listening on port 3000
Successfully connected to the database
```

## Add opencensus instrumentation 

To add opencensus instrumetation, follow the step below:

1. Navigate to the `node_modules` folder inside the EasyNotes application and create a link to OpenCensus Node project folder with:
```bash
cd node_modules
ln -s <your path>/opencensus-node/build/src  opencensus-nodejs
cd ..
```

2. Edit server.js and add the following line, as the first line of the file:
```javascript
 var tracing = require("opencensus-nodejs").start()
 ...
 var express = require('express');
 ```


## Running the Instrumented Application

Save the file server.js and run the app with debugging option. 

```bash
$ DEBUG=opencensus node server.js
opencensus useAsyncHooks = true +0ms  
opencensus patching http@9.8.0 module +75ms  
opencensus patching http.Server.prototype.emit function +7ms  
....
Server is listening on port 3000
Successfully connected to the database
```
This options uses a default exporter to console.

To test de api you can use the commands:
```bash
#To insert a note:
curl -X POST http://localhost:3000/notes --data '{"title": "Note 1", "content": "this is the note content"}' -H "Content-Type: application/json"

#To get notes:
curl http://localhost:3000/notes
```

## Exporting to Zipkins

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


## Exporting to Stackdriver

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


## Exporting to multiple Exporters

It is possible to instrument with more than one code. To achieve this, simply add more than one Exporter in series.

```javascript
var tracing = require("opencensus-nodejs")
              .addZipkin(“http://localhost:9411/api/v2/spans“, "easy-notes")
              .addStackdriver("your-project")
              .start()
```
