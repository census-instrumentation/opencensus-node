# Examples


## Stackdriver

The sample uses Application Default Credentials to authenticate with the Stackdriver service.

See https://developers.google.com/identity/protocols/application-default-credentials

You will need to:

1. Create a Google Cloud Platform project
2. Enable billing
3. Create a Stackdriver workspace
4. Create a service account and ensure it is permitted to write Stackdriver metrics
5. Run the sample

### Create Google Cloud Platform project and enable billing

```
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

### Create Service Account and set IAM policy

```
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

### Run it

```
GOOGLE_APPLICATION_CREDENTIALS=${FILE} node ./stackdriver.js
```

### Observe it

Look for the metrics (prefixed `repl/`) in metrics explorer:

```
google-chrome console.cloud.google.com/monitoring/?project=${PROJECT}
```


## Prometheus

The Prometheus sample is standalone and runs without any additional setup.

If you'd like to see the metrics consumed by a Prometheus server, you will need to configure this.

### Run it

```
node ./prometheus.js
```

You can observe the Prometheus Metrics Exporter that is created by the sample:
```
http://localhost:9465/metrics
```


