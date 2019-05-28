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

/** Constants for Cloud Resource environment. */
export const CLOUD_RESOURCE = {
  /** The type of the Resource. */
  TYPE: 'cloud',

  /**
   * Key for the name of the cloud provider. Example values are aws, azure,
   * gcp.
   */
  PROVIDER_KEY: 'cloud.provider',

  /** The value of the provider when running in AWS. */
  PROVIDER_AWS: 'aws',

  /** The value of the provider when running in AZURE. */
  PROVIDER_AZURE: 'azure',

  /** The value of the provider when running in GCP. */
  PROVIDER_GCP: 'gcp',

  /** Key for the region in which entities are running. */
  REGION_KEY: 'cloud.region',

  /** Key for the cloud account id used to identify different entities. */
  ACCOUNT_ID_KEY: 'cloud.account.id',

  /** Key for the zone in which entities are running. */
  ZONE_KEY: 'cloud.zone'
};

/** Constants for K8S container Resource. */
export const CONTAINER_RESOURCE = {
  /** Kubernetes resources key that represents a type of the resource. */
  TYPE: 'container',

  /** Key for the container name. */
  NAME_KEY: 'container.name',

  /** Key for the container image name. */
  IMAGE_NAME_KEY: 'container.image.name',

  /** Key for the container image tag. */
  IMAGE_TAG_KEY: 'container.image.tag'
};

/**
 * Constants for Host Resource. A host is defined as a general computing
 * instance.
 */
export const HOST_RESOURCE = {
  /** The type of the Resource. */
  TYPE: 'host',

  /**
   * Key for the hostname of the host.
   * It contains what the `hostname` command returns on the host machine.
   */
  HOSTNAME_KEY: 'host.hostname',

  /**
   * Key for the name of the host.
   * It may contain what `hostname` returns on Unix systems, the fully
   * qualified, or a name specified by the user.
   */
  NAME_KEY: 'host.name',

  /** Key for the unique host id (instance id in Cloud). */
  ID_KEY: 'host.id',

  /** Key for the type of the host (machine type). */
  TYPE_KEY: 'host.type'
};

/** Constants for Kubernetes deployment service Resource. */
export const K8S_RESOURCE = {
  /** The type of the Resource. */
  TYPE: 'k8s',

  /** Key for the name of the cluster. */
  CLUSTER_NAME_KEY: 'k8s.cluster.name',

  /** Key for the name of the namespace. */
  NAMESPACE_NAME_KEY: 'k8s.namespace.name',

  /** Key for the name of the pod. */
  POD_NAME_KEY: 'k8s.pod.name'
};
