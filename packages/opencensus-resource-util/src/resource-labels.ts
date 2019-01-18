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

/** Constants for collecting resource information. */
// tslint:disable-next-line:variable-name
export const AWSResourceKeyConstants = {
  /** AWS key that represents a type of the resource. */
  AWS_EC2_INSTANCE_TYPE: 'aws.com/ec2/instance',

  /** AWS key that represents a region for the VM. */
  AWS_REGION_KEY: 'aws.com/ec2/region',

  /** AWS key that represents the AWS account number for the VM. */
  AWS_ACCOUNT_KEY: 'aws.com/ec2/account_id',

  /** AWS key that represents the VM instance identifier assigned by AWS. */
  AWS_INSTANCE_ID_KEY: 'aws.com/ec2/instance_id',

  /** AWS key that represents a prefix for region value. */
  AWS_REGION_VALUE_PREFIX: 'aws:'
};

// tslint:disable-next-line:variable-name
export const GCPResourceKeyConstants = {
  /** GCP GCE key that represents a type of the resource. */
  GCP_GCE_INSTANCE_TYPE: 'cloud.google.com/gce/instance',

  /** GCP GCE key that represents the GCP account number for the instance. */
  GCP_ACCOUNT_ID_KEY: 'cloud.google.com/gce/project_id',

  /**
   * GCP GCE key that represents the numeric VM instance identifier assigned by
   * GCE.
   */
  GCP_INSTANCE_ID_KEY: 'cloud.google.com/gce/instance_id',

  /** GCP GCE key that represents the GCE zone in which the VM is running. */
  GCP_ZONE_KEY: 'cloud.google.com/gce/zone'
};

// tslint:disable-next-line:variable-name
export const K8SResourceKeyConstants = {
  /** Kubernetes resources key that represents a type of the resource. */
  K8S_CONTAINER_TYPE: 'k8s.io/container',

  /**
   * Kubernetes resources key that represents the name for the cluster the
   * container is running in.
   */
  K8S_CLUSTER_NAME_KEY: 'k8s.io/cluster/name',

  /** Kubernetes resources key that represents the name of the container. */
  K8S_CONTAINER_NAME_KEY: 'k8s.io/container/name',

  /**
   * Kubernetes resources key that represents the identifier for the GCE
   * instance the container is running in.
   */
  K8S_NAMESPACE_NAME_KEY: 'k8s.io/namespace/name',

  /**
   * Kubernetes resources key that represents the identifier for the pod the
   * container is running in.
   */
  K8S_POD_NAME_KEY: 'k8s.io/pod/name'
};
