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

import { CoreResource, Resource } from '@opencensus/core';
import {
  getAwsEC2Resource,
  getComputerEngineResource,
  getKubernetesEngineResource,
  getResourceType,
  ResourceType,
} from './resource-utils';

/**
 * Returns a Resource. Detector sequentially runs resource detection from
 * environment variables, K8S, GCE and AWS.
 */
export async function detectResource(): Promise<Resource> {
  const resources = [CoreResource.createFromEnvironmentVariables()];

  const resourceType = await getResourceType();
  if (resourceType === ResourceType.GCP_GKE_CONTAINER) {
    resources.push(await getKubernetesEngineResource());
  } else if (resourceType === ResourceType.GCP_GCE_INSTANCE) {
    resources.push(await getComputerEngineResource());
  }
  if (resourceType === ResourceType.AWS_EC2_INSTANCE) {
    resources.push(await getAwsEC2Resource());
  }

  return CoreResource.mergeResources(resources);
}
