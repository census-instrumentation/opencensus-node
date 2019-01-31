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

import {Labels} from '@opencensus/core';
import * as resource from '@opencensus/resource-util';
import {MonitoredResource} from './types';

const STACKDRIVER_PROJECT_ID_KEY = 'project_id';
const AWS_REGION_VALUE_PREFIX = 'aws:';

/* Return a self-configured StackDriver monitored resource. */
export async function getDefaultResource(projectId: string):
    Promise<MonitoredResource> {
  const labels: Labels = {project_id: projectId};
  const autoDetectedResource = await resource.detectResource();
  const [type, mappings] = getTypeAndMappings(autoDetectedResource.type);
  Object.keys(mappings).forEach((key) => {
    if (autoDetectedResource.labels[mappings[key]]) {
      if (mappings[key] === resource.AWS_REGION_KEY) {
        labels[key] = `${AWS_REGION_VALUE_PREFIX}${
            autoDetectedResource.labels[mappings[key]]}`;
      } else {
        labels[key] = autoDetectedResource.labels[mappings[key]];
      }
    }
  });
  return {type, labels};
}

function getTypeAndMappings(resourceType: string): [string, Labels] {
  switch (resourceType) {
    case resource.GCP_GCE_INSTANCE_TYPE:
      // https://cloud.google.com/monitoring/api/resources#tag_gce_instance
      return [
        'gce_instance', {
          'project_id': STACKDRIVER_PROJECT_ID_KEY,
          'instance_id': resource.GCP_INSTANCE_ID_KEY,
          'zone': resource.GCP_ZONE_KEY
        }
      ];
    case resource.K8S_CONTAINER_TYPE:
      // https://cloud.google.com/monitoring/api/resources#tag_k8s_container
      return [
        'k8s_container', {
          'project_id': STACKDRIVER_PROJECT_ID_KEY,
          'location': resource.GCP_ZONE_KEY,
          'cluster_name': resource.K8S_CLUSTER_NAME_KEY,
          'namespace_name': resource.K8S_NAMESPACE_NAME_KEY,
          'pod_name': resource.K8S_POD_NAME_KEY,
          'container_name': resource.K8S_CONTAINER_NAME_KEY
        }
      ];
    case resource.AWS_EC2_INSTANCE_TYPE:
      // https://cloud.google.com/monitoring/api/resources#tag_aws_ec2_instance
      return [
        'aws_ec2_instance', {
          'project_id': STACKDRIVER_PROJECT_ID_KEY,
          'instance_id': resource.AWS_INSTANCE_ID_KEY,
          'region': resource.AWS_REGION_KEY,
          'aws_account': resource.AWS_ACCOUNT_KEY
        }
      ];
    default:
      return ['global', {}];
  }
}
