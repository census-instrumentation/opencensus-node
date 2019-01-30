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

/**
 * Utilities for for auto detecting monitored resource based on the environment
 * where the application is running.
 */

import {Labels, Resource} from '@opencensus/core';
import * as gcpMetadata from 'gcp-metadata';
import * as http from 'http';
import * as os from 'os';
import * as constants from './resource-labels';

export const AWS_INSTANCE_IDENTITY_DOCUMENT_URI =
    'http://169.254.169.254/latest/dynamic/instance-identity/document';
let resourceType: ResourceType|undefined;
let gkeResourceLabels: Labels = {};
let gceResourceLabels: Labels = {};
let awsResourceLabels: Labels = {};

/** Currently supported monitored resource types */
export enum ResourceType {
  GCP_GKE_CONTAINER = 'k8s_container',
  GCP_GCE_INSTANCE = 'gce_instance',
  AWS_EC2_INSTANCE = 'aws_ec2_instance',
  NONE = 'NONE'
}

/** Determine the compute environment in which the code is running. */
export async function getResourceType(): Promise<ResourceType> {
  if (resourceType) {
    return resourceType;
  }
  if (process.env.KUBERNETES_SERVICE_HOST) {
    resourceType = ResourceType.GCP_GKE_CONTAINER;
  } else if (await isRunningOnComputeEngine()) {
    resourceType = ResourceType.GCP_GCE_INSTANCE;
  } else if (await isRunningOnAwsEc2()) {
    resourceType = ResourceType.AWS_EC2_INSTANCE;
  } else {
    resourceType = ResourceType.NONE;
  }
  return resourceType;
}

/** Determine if the GCP metadata server is currently available. */
async function isRunningOnComputeEngine() {
  return gcpMetadata.isAvailable();
}

/**
 * Detects if the application is running on EC2 by making a connection to AWS
 * instance identity document URI. If connection is successful, application
 * should be on an EC2 instance.
 */
async function isRunningOnAwsEc2() {
  try {
    const awsIdentityDocument: Labels = await awsMetadataAccessor();
    awsResourceLabels[constants.AWS_ACCOUNT_KEY] =
        awsIdentityDocument.accountId;
    awsResourceLabels[constants.AWS_REGION_KEY] = awsIdentityDocument.region;
    awsResourceLabels[constants.AWS_INSTANCE_ID_KEY] =
        awsIdentityDocument.instanceId;
    return true;
  } catch {
    return false;
  }
}

/** Returns Resource for GCP GCE instance. */
export async function getComputerEngineResource(): Promise<Resource> {
  if (Object.keys(gceResourceLabels).length === 0) {
    const [projectId, instanceId, zoneId] =
        await Promise.all([getProjectId(), getInstanceId(), getZone()]);
    gceResourceLabels[constants.GCP_ACCOUNT_ID_KEY] = projectId;
    gceResourceLabels[constants.GCP_INSTANCE_ID_KEY] = instanceId;
    gceResourceLabels[constants.GCP_ZONE_KEY] = zoneId;
  }
  return {type: constants.GCP_GCE_INSTANCE_TYPE, labels: gceResourceLabels};
}

/** Returns Resource for GCP GKE container. */
export async function getKubernetesEngineResource(): Promise<Resource> {
  if (Object.keys(gkeResourceLabels).length === 0) {
    const [projectId, zoneId, clusterName, hostname] = await Promise.all(
        [getProjectId(), getZone(), getClusterName(), getHostname()]);
    gkeResourceLabels[constants.GCP_ACCOUNT_ID_KEY] = projectId;
    gkeResourceLabels[constants.GCP_ZONE_KEY] = zoneId;
    gkeResourceLabels[constants.K8S_CLUSTER_NAME_KEY] = clusterName;
    gkeResourceLabels[constants.K8S_NAMESPACE_NAME_KEY] =
        process.env.NAMESPACE || '';
    gkeResourceLabels[constants.K8S_POD_NAME_KEY] = hostname;
    gkeResourceLabels[constants.K8S_CONTAINER_NAME_KEY] =
        process.env.CONTAINER_NAME || '';
  }
  return {type: constants.K8S_CONTAINER_TYPE, labels: gkeResourceLabels};
}

/** Returns Resource for AWS EC2 instance. */
export async function getAwsEC2Resource(): Promise<Resource> {
  return {type: constants.AWS_EC2_INSTANCE_TYPE, labels: awsResourceLabels};
}

/**
 * Establishes an HTTP connection to AWS instance identity document url.
 * If the application is running on an EC2 instance, we should be able
 * to get back a valid JSON document. Parses that document and stores
 * the identity properties in a local map.
 */
async function awsMetadataAccessor<T>(): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('EC2 metadata api request timed out.'));
  }, 2000);

    const req = http.get(AWS_INSTANCE_IDENTITY_DOCUMENT_URI, (res) => {
      clearTimeout(timeoutId);
      const {statusCode} = res;
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => rawData += chunk);
      res.on('end', () => {
        if (statusCode && statusCode >= 200 && statusCode < 300) {
          try {
            resolve(JSON.parse(rawData));
          } catch (e) {
            res.resume();  // consume response data to free up memory
            reject(e);
          }
        } else {
          res.resume();  // consume response data to free up memory
          reject(new Error('Failed to load page, status code: ' + statusCode));
        }
      });
    });
    req.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/** Gets project id from GCP project metadata. */
async function getProjectId() {
  try {
    return await gcpMetadata.project('project-id');
  } catch {
    return '';
  }
}

/** Gets instance id from GCP instance metadata. */
async function getInstanceId() {
  try {
    const id = await gcpMetadata.instance('id');
    return id.toString();
  } catch {
    return '';
  }
}

/** Gets zone from GCP instance metadata. */
async function getZone() {
  try {
    const zoneId = await gcpMetadata.instance('zone');
    if (zoneId) {
      return zoneId.split('/').pop();
    }
  } catch {
    return '';
  }
}

/** Gets cluster name from GCP instance metadata. */
async function getClusterName() {
  try {
    return await gcpMetadata.instance('attributes/cluster-name');
  } catch {
    return '';
  }
}

/** Gets hostname from GCP instance metadata. */
async function getHostname() {
  try {
    return await gcpMetadata.instance('hostname');
  } catch (ignore) {
    return os.hostname();
  }
}

export function clear() {
  resourceType = undefined;
  gkeResourceLabels = {};
  gceResourceLabels = {};
  awsResourceLabels = {};
}
