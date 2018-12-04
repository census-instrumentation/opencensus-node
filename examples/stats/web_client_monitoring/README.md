# Monitoring Web Metrics with OpenCenus and Stackdriver
This example demonstrates instrumentation of browser code in a web application
for monitoring web metrics with a JavaScript module. See the schematic diagram
below for a graphical description.

<img src='https://github.com/alexamies/opencensus-node/examples/stats/web_client_monitoring/schematic_diagram.png'/>

## Prerequisites
Install [Node.js](https://nodejs.org) in your local development environment.
Create a GCP project and set it as your default project with the command
```
export GOOGLE_CLOUD_PROJECT=[your project id]
gcloud config set project $GOOGLE_CLOUD_PROJECT
```

You will need the environment variable GOOGLE_CLOUD_PROJECT exported to the
Node.js runtime for it to send the data to Stackdriver when running in a local
development environment. The choice of variable name matches the [App Engine
Flex](https://cloud.google.com/appengine/docs/standard/nodejs/runtime#environment_variables)
environment variable name.

## Web Client Compilation
Set up Nodejs and Webpack:
```
cd web_client
npm install
```

Compile the client JavaScript
```
npm run build
```

## Running locally
To run the example locally follow the instructions in [Getting Started with
Authentication](https://cloud.google.com/docs/authentication/getting-started)
to make a service account key available via the GOOGLE_APPLICATION_CREDENTIALS
environment variable. Then serve the HTML file from the Node.js server with
Express:
```
npm install
npm start
```

Navigate to the page at http://localhost:8080 with a browser.

## Deploying to App Engine
The app can be deployed to App Engine with no changes. All that is needed is
an app.yaml file. To deploy it run the command
```
npm run deploy
```

This will use the gcloud app deploy command, which will deploy the app as an
Express app using the App Engine Flex Nodejs runtime.

## Configuring Stackdriver
To see the metrics data in Stackdriver, select Monitoring in the main menu to
bring up the Stackdriver user interface. Create a new dashboard. Create new
charts for the dashboard. Add the metrics collected to the chart. The metric
names are listed in the app.js file. An example screenshot is shown below.
You may want to use one chart for the (double value) timing data and one chart
for the (integer value) click counts.

<img src='https://github.com/alexamies/opencensus-node/examples/stats/web_client_monitoring/stackdriver_dashboard.png'/>

