/**
 * Copyright 2019, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { CoreResource } from '@opencensus/core';
import * as assert from 'assert';
import {
  BASE_PATH,
  HEADER_NAME,
  HEADER_VALUE,
  HOST_ADDRESS,
  SECONDARY_HOST_ADDRESS,
  resetIsAvailableCache,
} from 'gcp-metadata';
import * as nock from 'nock';
import * as resource from '../src';
import {
  CLOUD_RESOURCE,
  CONTAINER_RESOURCE,
  HOST_RESOURCE,
  K8S_RESOURCE,
} from '../src/constants';
import * as resourceUtil from '../src/resource-utils';

// NOTE: nodejs switches all incoming header names to lower case.
const HEADERS = {
  [HEADER_NAME.toLowerCase()]: HEADER_VALUE,
};
const INSTANCE_PATH = BASE_PATH + '/instance';
const INSTANCE_ID_PATH = BASE_PATH + '/instance/id';
const PROJECT_ID_PATH = BASE_PATH + '/project/project-id';
const ZONE_PATH = BASE_PATH + '/instance/zone';
const CLUSTER_NAME_PATH = BASE_PATH + '/instance/attributes/cluster-name';
const mockedAwsResponse = {
  instanceId: 'my-instance-id',
  accountId: 'my-account-id',
  region: 'my-region',
};

describe('detectResource', () => {
  before(() => {
    nock.disableNetConnect();
  });

  after(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();
    resetIsAvailableCache();
    resourceUtil.clear();
    delete process.env.KUBERNETES_SERVICE_HOST;
    delete process.env.NAMESPACE;
    delete process.env.CONTAINER_NAME;
    delete process.env.OC_RESOURCE_TYPE;
    delete process.env.OC_RESOURCE_LABELS;
    delete process.env.HOSTNAME;
    CoreResource.setup();
  });

  it('should return GCP_GKE_CONTAINER resource when KUBERNETES_SERVICE_HOST is set', async () => {
    process.env.KUBERNETES_SERVICE_HOST = 'my-host';
    process.env.HOSTNAME = 'my-hostname';
    const scope = nock(HOST_ADDRESS)
      .get(CLUSTER_NAME_PATH)
      .reply(200, () => 'my-cluster', HEADERS)
      .get(PROJECT_ID_PATH)
      .reply(200, () => 'my-project-id', HEADERS)
      .get(ZONE_PATH)
      .reply(200, () => 'project/zone/my-zone', HEADERS);
    const { type, labels } = await resource.detectResource();
    scope.done();

    assert.deepStrictEqual(type, resource.K8S_CONTAINER_TYPE);
    assert.strictEqual(Object.keys(labels).length, 6);
    assert.strictEqual(labels[CLOUD_RESOURCE.ACCOUNT_ID_KEY], 'my-project-id');
    assert.strictEqual(labels[CLOUD_RESOURCE.ZONE_KEY], 'my-zone');
    assert.strictEqual(labels[K8S_RESOURCE.CLUSTER_NAME_KEY], 'my-cluster');
    assert.strictEqual(labels[K8S_RESOURCE.POD_NAME_KEY], 'my-hostname');
    assert.strictEqual(labels[K8S_RESOURCE.NAMESPACE_NAME_KEY], '');
    assert.strictEqual(labels[CONTAINER_RESOURCE.NAME_KEY], '');
  });

  it('should return GCP_GKE_CONTAINER resource when KUBERNETES_SERVICE_HOST, NAMESPACE and CONTAINER_NAME is set', async () => {
    process.env.KUBERNETES_SERVICE_HOST = 'my-host';
    process.env.NAMESPACE = 'my-namespace';
    process.env.HOSTNAME = 'my-hostname';
    process.env.CONTAINER_NAME = 'my-container-name';
    const scope = nock(HOST_ADDRESS)
      .get(CLUSTER_NAME_PATH)
      .reply(200, () => 'my-cluster', HEADERS)
      .get(PROJECT_ID_PATH)
      .reply(200, () => 'my-project-id', HEADERS)
      .get(ZONE_PATH)
      .reply(200, () => 'project/zone/my-zone', HEADERS);
    const { type, labels } = await resource.detectResource();
    scope.done();

    assert.deepStrictEqual(type, resource.K8S_CONTAINER_TYPE);
    assert.strictEqual(Object.keys(labels).length, 6);
    assert.strictEqual(labels[CLOUD_RESOURCE.ACCOUNT_ID_KEY], 'my-project-id');
    assert.strictEqual(labels[CLOUD_RESOURCE.ZONE_KEY], 'my-zone');
    assert.strictEqual(labels[K8S_RESOURCE.CLUSTER_NAME_KEY], 'my-cluster');
    assert.strictEqual(labels[K8S_RESOURCE.POD_NAME_KEY], 'my-hostname');
    assert.strictEqual(labels[K8S_RESOURCE.NAMESPACE_NAME_KEY], 'my-namespace');
    assert.strictEqual(
      labels[CONTAINER_RESOURCE.NAME_KEY],
      'my-container-name'
    );

    // fetch again, this shouldn't make http call again
    const { type: type1, labels: labels1 } = await resource.detectResource();
    assert.deepStrictEqual(type, type1);
    assert.deepStrictEqual(labels, labels1);
  });

  it('Should merge resources from CoreResource and detected k8s resource', async () => {
    process.env.OC_RESOURCE_TYPE = 'k8s.io/container';
    process.env.OC_RESOURCE_LABELS =
      'k8s.pod.name=pod-xyz-123,container.name=c1,k8s.namespace.name=default';
    CoreResource.setup();

    process.env.KUBERNETES_SERVICE_HOST = 'my-host';
    const scope = nock(HOST_ADDRESS)
      .get(CLUSTER_NAME_PATH)
      .reply(200, () => 'my-cluster', HEADERS)
      .get(PROJECT_ID_PATH)
      .reply(200, () => 'my-project-id', HEADERS)
      .get(ZONE_PATH)
      .reply(200, () => 'project/zone/my-zone', HEADERS);
    const { type, labels } = await resource.detectResource();
    scope.done();

    assert.deepStrictEqual(type, resource.K8S_CONTAINER_TYPE);
    assert.strictEqual(Object.keys(labels).length, 6);
    assert.strictEqual(labels[CLOUD_RESOURCE.ACCOUNT_ID_KEY], 'my-project-id');
    assert.strictEqual(labels[CLOUD_RESOURCE.ZONE_KEY], 'my-zone');
    assert.strictEqual(labels[K8S_RESOURCE.CLUSTER_NAME_KEY], 'my-cluster');
    assert.strictEqual(labels[K8S_RESOURCE.POD_NAME_KEY], 'pod-xyz-123');
    assert.strictEqual(labels[K8S_RESOURCE.NAMESPACE_NAME_KEY], 'default');
    assert.strictEqual(labels[CONTAINER_RESOURCE.NAME_KEY], 'c1');
  });

  it('should return GCP_GCE_INSTANCE resource', async () => {
    const scope = nock(HOST_ADDRESS)
      .get(INSTANCE_PATH)
      .reply(200, {}, HEADERS)
      .get(PROJECT_ID_PATH)
      .reply(200, () => 'my-project-id', HEADERS)
      .get(ZONE_PATH)
      .reply(200, () => 'project/zone/my-zone', HEADERS)
      .get(INSTANCE_ID_PATH)
      .reply(200, () => 4520031799277581759, HEADERS);
    const scope1 = nock(SECONDARY_HOST_ADDRESS)
      .get(INSTANCE_PATH)
      .reply(200, {}, HEADERS);
    const { type, labels } = await resource.detectResource();
    scope1.done();
    scope.done();

    assert.deepStrictEqual(type, resource.GCP_GCE_INSTANCE_TYPE);
    assert.strictEqual(Object.keys(labels).length, 3);
    assert.strictEqual(labels[CLOUD_RESOURCE.ACCOUNT_ID_KEY], 'my-project-id');
    assert.strictEqual(labels[CLOUD_RESOURCE.ZONE_KEY], 'my-zone');
    assert.strictEqual(labels[HOST_RESOURCE.ID_KEY], '4520031799277582000');
  });

  it('should retry if the initial request fails', async () => {
    // gcp-metadata uses Promise.race between the two addresses, so set them up to
    // each fail once then one of them will succeed after.
    function configureNock(scope: nock.Scope): nock.Scope {
      return scope
        .get(INSTANCE_PATH)
        .reply(500)
        .get(INSTANCE_PATH)
        .reply(200, {}, HEADERS)
        .get(PROJECT_ID_PATH)
        .reply(200, () => 'my-project-id', HEADERS)
        .get(ZONE_PATH)
        .reply(200, () => 'project/zone/my-zone', HEADERS)
        .get(INSTANCE_ID_PATH)
        .reply(200, () => 4520031799277581759, HEADERS);
    }

    const scope = configureNock(nock(HOST_ADDRESS));
    const secondaryScope = configureNock(nock(SECONDARY_HOST_ADDRESS));
    const { type, labels } = await resource.detectResource();

    // One of the two scopes should be fully consumed
    assert.ok(scope.isDone() || secondaryScope.isDone());

    assert.deepStrictEqual(type, resource.GCP_GCE_INSTANCE_TYPE);
    assert.strictEqual(Object.keys(labels).length, 3);
    assert.strictEqual(labels[CLOUD_RESOURCE.ACCOUNT_ID_KEY], 'my-project-id');
    assert.strictEqual(labels[CLOUD_RESOURCE.ZONE_KEY], 'my-zone');
    assert.strictEqual(labels[HOST_RESOURCE.ID_KEY], '4520031799277582000');
  });

  it('should return GCP_GCE_INSTANCE resource and empty data for non avaiable metadata attribute', async () => {
    const scope = nock(HOST_ADDRESS)
      .get(INSTANCE_PATH)
      .reply(200, {}, HEADERS)
      .get(PROJECT_ID_PATH)
      .reply(200, () => 'my-project-id', HEADERS)
      .get(ZONE_PATH)
      .reply(413)
      .get(INSTANCE_ID_PATH)
      .reply(400, undefined, HEADERS);
    const secondaryScope = nock(SECONDARY_HOST_ADDRESS)
      .get(INSTANCE_PATH)
      .reply(200, {}, HEADERS);
    const { type, labels } = await resource.detectResource();
    secondaryScope.done();
    scope.done();

    assert.deepStrictEqual(type, resource.GCP_GCE_INSTANCE_TYPE);
    assert.strictEqual(Object.keys(labels).length, 3);
    assert.strictEqual(labels[CLOUD_RESOURCE.ACCOUNT_ID_KEY], 'my-project-id');
    assert.strictEqual(labels[CLOUD_RESOURCE.ZONE_KEY], '');
    assert.strictEqual(labels[HOST_RESOURCE.ID_KEY], '');

    // fetch again, this shouldn't make http call again
    const { type: type1, labels: labels1 } = await resource.detectResource();
    assert.deepStrictEqual(type, type1);
    assert.deepStrictEqual(labels, labels1);
  });

  it('Should merge resources from CoreResource and detected gce resource', async () => {
    process.env.OC_RESOURCE_TYPE = 'global';
    process.env.OC_RESOURCE_LABELS = 'cloud.zone=zone1,user=user1,version=1.0';
    CoreResource.setup();
    const scope = nock(HOST_ADDRESS)
      .get(INSTANCE_PATH)
      .reply(200, {}, HEADERS)
      .get(PROJECT_ID_PATH)
      .reply(200, () => 'my-project-id', HEADERS)
      .get(ZONE_PATH)
      .reply(200, () => 'project/zone/my-zone', HEADERS)
      .get(INSTANCE_ID_PATH)
      .reply(200, () => 4520031799277581759, HEADERS);
    const secondaryScope = nock(SECONDARY_HOST_ADDRESS)
      .get(INSTANCE_PATH)
      .reply(200, {}, HEADERS);
    const { type, labels } = await resource.detectResource();
    secondaryScope.done();
    scope.done();

    assert.deepStrictEqual(type, 'global');
    assert.strictEqual(Object.keys(labels).length, 5);
    assert.strictEqual(labels[CLOUD_RESOURCE.ACCOUNT_ID_KEY], 'my-project-id');
    assert.strictEqual(labels[CLOUD_RESOURCE.ZONE_KEY], 'zone1');
    assert.strictEqual(labels[HOST_RESOURCE.ID_KEY], '4520031799277582000');
    assert.strictEqual(labels['user'], 'user1');
    assert.strictEqual(labels['version'], '1.0');
  });

  it('should return aws_ec2_instance resource', async () => {
    const gcpScope = nock(HOST_ADDRESS)
      .get(INSTANCE_PATH)
      .replyWithError({
        code: 'ENOTFOUND',
      });
    const awsScope = nock(resourceUtil.AWS_INSTANCE_IDENTITY_DOCUMENT_URI)
      .get('')
      .reply(200, () => mockedAwsResponse, HEADERS);
    const { type, labels } = await resource.detectResource();
    awsScope.done();
    gcpScope.done();

    assert.deepStrictEqual(type, resource.AWS_EC2_INSTANCE_TYPE);
    assert.strictEqual(Object.keys(labels).length, 3);
    assert.strictEqual(labels[CLOUD_RESOURCE.ACCOUNT_ID_KEY], 'my-account-id');
    assert.strictEqual(labels[HOST_RESOURCE.ID_KEY], 'my-instance-id');
    assert.strictEqual(labels[CLOUD_RESOURCE.REGION_KEY], 'my-region');

    // fetch again, this shouldn't make http call again
    const { type: type1, labels: labels1 } = await resource.detectResource();
    assert.deepStrictEqual(type, type1);
    assert.deepStrictEqual(labels, labels1);
  });

  it('Should merge resources from CoreResource and detected aws_ec2_instance resource', async () => {
    process.env.OC_RESOURCE_TYPE = 'aws.com/ec2/instance';
    process.env.OC_RESOURCE_LABELS = 'cloud.region=default';
    CoreResource.setup();

    const gcpScope = nock(HOST_ADDRESS)
      .get(INSTANCE_PATH)
      .replyWithError({
        code: 'ENOTFOUND',
      });
    const awsScope = nock(resourceUtil.AWS_INSTANCE_IDENTITY_DOCUMENT_URI)
      .get('')
      .reply(200, () => mockedAwsResponse, HEADERS);
    const { type, labels } = await resource.detectResource();
    awsScope.done();
    gcpScope.done();

    assert.deepStrictEqual(type, resource.AWS_EC2_INSTANCE_TYPE);
    assert.strictEqual(Object.keys(labels).length, 3);
    assert.strictEqual(labels[CLOUD_RESOURCE.ACCOUNT_ID_KEY], 'my-account-id');
    assert.strictEqual(labels[HOST_RESOURCE.ID_KEY], 'my-instance-id');
    assert.strictEqual(labels[CLOUD_RESOURCE.REGION_KEY], 'default');
  });

  it('return empty labels when failed to find any resources', async () => {
    const gcpScope = nock(HOST_ADDRESS)
      .get(INSTANCE_PATH)
      .replyWithError({
        code: 'ENOTFOUND',
      });
    const awsScope = nock(resourceUtil.AWS_INSTANCE_IDENTITY_DOCUMENT_URI)
      .get('')
      .replyWithError({ code: 'ENOTFOUND' });
    const { type, labels } = await resource.detectResource();
    awsScope.done();
    gcpScope.done();

    assert.deepStrictEqual(type, null);
    assert.strictEqual(Object.keys(labels).length, 0);
  });
});
