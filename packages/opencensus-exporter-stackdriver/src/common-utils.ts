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

import { Labels } from '@opencensus/core';
import * as resource from '@opencensus/resource-util';
import {
  CLOUD_RESOURCE,
  CONTAINER_RESOURCE,
  HOST_RESOURCE,
  K8S_RESOURCE,
} from '@opencensus/resource-util';
import { MonitoredResource } from './types';

const STACKDRIVER_PROJECT_ID_KEY = 'project_id';
const AWS_REGION_VALUE_PREFIX = 'aws:';
const K8S_CONTAINER = 'k8s_container';
const GCP_GCE_INSTANCE = 'gce_instance';
const AWS_EC2_INSTANCE = 'aws_ec2_instance';

/* Return a self-configured StackDriver monitored resource. */
export async function getDefaultResource(
  projectId: string
): Promise<MonitoredResource> {
  const labels: Labels = { project_id: projectId };
  const autoDetectedResource = await resource.detectResource();
  const [type, mappings] = getTypeAndMappings(autoDetectedResource.type);
  Object.keys(mappings).forEach(key => {
    if (autoDetectedResource.labels[mappings[key]]) {
      if (
        type === AWS_EC2_INSTANCE &&
        mappings[key] === CLOUD_RESOURCE.REGION_KEY
      ) {
        labels[key] = `${AWS_REGION_VALUE_PREFIX}${
          autoDetectedResource.labels[mappings[key]]
        }`;
      } else {
        labels[key] = autoDetectedResource.labels[mappings[key]];
      }
    }
  });
  if (Object.keys(labels).length !== Object.keys(mappings).length) {
    return { type: 'global', labels: { project_id: projectId } };
  }
  return { type, labels };
}

function getTypeAndMappings(resourceType: string | null): [string, Labels] {
  switch (resourceType) {
    case resource.GCP_GCE_INSTANCE_TYPE:
      // https://cloud.google.com/monitoring/api/resources#tag_gce_instance
      return [
        GCP_GCE_INSTANCE,
        {
          project_id: STACKDRIVER_PROJECT_ID_KEY,
          instance_id: HOST_RESOURCE.ID_KEY,
          zone: CLOUD_RESOURCE.ZONE_KEY,
        },
      ];
    case resource.K8S_CONTAINER_TYPE:
      // https://cloud.google.com/monitoring/api/resources#tag_k8s_container
      return [
        K8S_CONTAINER,
        {
          project_id: STACKDRIVER_PROJECT_ID_KEY,
          location: CLOUD_RESOURCE.ZONE_KEY,
          cluster_name: K8S_RESOURCE.CLUSTER_NAME_KEY,
          namespace_name: K8S_RESOURCE.NAMESPACE_NAME_KEY,
          pod_name: K8S_RESOURCE.POD_NAME_KEY,
          container_name: CONTAINER_RESOURCE.NAME_KEY,
        },
      ];
    case resource.AWS_EC2_INSTANCE_TYPE:
      // https://cloud.google.com/monitoring/api/resources#tag_aws_ec2_instance
      return [
        AWS_EC2_INSTANCE,
        {
          project_id: STACKDRIVER_PROJECT_ID_KEY,
          instance_id: HOST_RESOURCE.ID_KEY,
          region: CLOUD_RESOURCE.REGION_KEY,
          aws_account: CLOUD_RESOURCE.ACCOUNT_ID_KEY,
        },
      ];
    default:
      return ['global', {}];
  }
}
