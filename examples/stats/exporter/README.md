# Examples

You will need to:

1. Clone this repo and install dependent packages

```bash
WORK=[[YOUR-WORKING-DIRECTORY]]
cd ${WORK}

git clone https://github.com/census-instrumentation/opencensus-node

cd opencensus-node
npm install
```

## Stackdriver

The sample uses Application Default Credentials to authenticate with the Stackdriver service.

See https://developers.google.com/identity/protocols/application-default-credentials

You will need to:

1. Create a Google Cloud Platform project and Enable Billing
1. Create a Stackdriver workspace
1. Create a service account and ensure it is permitted to write Stackdriver metrics
1. Optional: Visual Studio Code debugging
1. Run the sample
1. Observe the metrics

### Create Google Cloud Platform project and Enable Billing

```bash
PROJECT=[[YOUR-PROJECT]]
BILLING=[[YOUR-BILLING]]

gcloud projects create ${PROJECT}

gcloud beta billing projects link ${PROJECT} \
--billing-account=${BILLING}
```
### Create Stackdriver workspace

```
google-chrome console.cloud.google.com/monitoring/?project=${PROJECT}
```

### Create Service Account with correct permissions

```bash
ACCOUNT=[[YOUR-SERVICE-ACCOUNT]]
ADDRESS=${ACCOUNT}@${PROJECT}.iam.gserviceaccount.com

WORK=[[YOUR-WORKING-DIRECTORY]]
FILE="${WORK}/${ACCOUNT}.key.json"

gcloud iam service-accounts create ${ACCOUNT} \
--display-name=${ACCOUNT} \
--project=${PROJECT}

gcloud projects add-iam-policy-binding ${PROJECT} \
--member=serviceAccount:${ADDRESS} \
--role=roles/monitoring.metricWriter

gcloud iam service-accounts keys create ${FILE} \
--iam-account=${ACCOUNT}@${PROJECT}.iam.gserviceaccount.com \
--project=${PROJECT}
```

### Optional: Visual Studio Code Debugging 

If you wish to debug the code in Visual Studio Code, you will need to edit the `launch.json` file:

```json
{
    "version": "0.2.0",
    "configurations": [
        ...,
        {
            "type": "node",
            "request": "launch",
            "name": "Stackdriver",
            "program": "${workspaceFolder}/examples/stats/exporter/stackdriver.js",
            "env":{
                "GOOGLE_APPLICATION_CREDENTIALS":"[[Replace with the value of ${WORK}/${ACCOUNT}.key.json]]",
                "GOOGLE_PROJECT_ID": "[[Replace with the value of ${PROJECT}]]"
            }
        },
      ...,
    ]
}
```

### Run it

```bash
GOOGLE_APPLICATION_CREDENTIALS=${FILE} node ./stackdriver.js
```

Alternatively, if you'd prefer to use Docker:

```bash
IMAGE=[[YOUR-STACKDRIVER-IMAGE]]
TAG=[[YOUR-TAG]]

docker build \
  --tag=${IMAGE}:${TAG} \
  --file=./Dockerfile.stackdriver \
  .

docker run \
  --interactive \
  --tty \
  --mount=type=bind,src=${WORK}/${ACCOUNT}.key.json,dst=/keys/${ACCOUNT}.key.json \
  --env=GOOGLE_APPLICATION_CREDENTIALS=/keys/${ACCOUNT}.key.json \
  --env=GOOGLE_PROJECT_ID=${PROJECT} \
  ${IMAGE}:${TAG}
```

### Observe it

Look for the metrics (prefixed `repl/`) in metrics explorer:

```bash
google-chrome console.cloud.google.com/monitoring/?project=${PROJECT}
```


## Prometheus

The Prometheus sample is standalone and runs without any additional setup.

If you'd like to see the metrics consumed by a Prometheus server, you will need to configure this.

### Optional: Visual Studio Code Debugging 

If you wish to debug the code in Visual Studio Code, you will need to edit the `launch.json` file:

```json
{
    "version": "0.2.0",
    "configurations": [
        ...,
        {
            "type": "node",
            "request": "launch",
            "name": "Prometheus",
            "program": "${workspaceFolder}/examples/stats/exporter/prometheus.js"
        },
      ...,
    ]
}
```


### Run it

```bash
node ./prometheus.js
```

Alternatively, if you'd prefer to use Docker:

```bash
IMAGE=[[YOUR-PROMETHEUS-IMAGE]]
TAG=[[YOUR-TAG]]

docker build \
  --tag=${IMAGE}:${TAG} \
  --file=./Dockerfile.prometheus \
  .

docker run \
  --interactive \
  --tty \
  --publish=9464:9464 \
  ${IMAGE}:${TAG}
```

### Observer it

You can observe the Prometheus Metrics Exporter that is created by the sample:
```bash
google-chrome http://localhost:9464/metrics
```


