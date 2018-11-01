export enum MonitoredResources {
  GCP_GCE_INSTANCE = 'gce_instance',
  GCP_GKE_CONTAINER = 'gke_container',
  AWS_EC2_INSTANCE = 'aws_ec2_instance'
}

export const monitoredResourceAttributes: Record<
    string, Record<string, string>> = {
  /**
   * GCE common attributes
   * See:
   * https://cloud.google.com/appengine/docs/flexible/python/runtime#environment_variables
   */
  GCE: {
    /**
     * Numeric VM instance identifier assigned by Compute Engine.
     */
    instance_id: 'instance/id',
    /**
     * ProjectID is the identifier of the GCP project associated with this
     * resource, such as "my-project".
     */
    project_id: 'project/project-id',
    /** Compute Engine zone in which the VM is running. */
    zone: 'instance/zone',
  },
  GKE: {
    /**
     * Name for the cluster container is running in.
     */
    cluster_name: 'instance/attributes/cluster-name',
    /**
     * Numeric VM instance identifier assigned by Compute Engine.
     */
    instance_id: 'instance/id',
    /**
     * ProjectID is the identifier of the GCP project associated with this
     * resource, such as "my-project".
     */
    project_id: 'project/project-id',
    /**
     * Compute Engine zone in which the VM is running.
     */
    zone: 'instance/zone',
  },
  AWS: {
    /**
     * The AWS region for the VM. The format of this field is "aws:{region}",
     * where supported values for {region} are listed at
     * http://docs.aws.amazon.com/general/latest/gr/rande.html.
     */
    region: 'region',
    /**
     * The AWS account number for the VM.
     */
    accountId: 'aws_account',
    /**
     * The instance id of the instance.
     */
    instanceId: 'instance_id'
  }
};

export type MonitoredResourceType =
    MonitoredResources.GCP_GKE_CONTAINER|
    MonitoredResources.GCP_GCE_INSTANCE|MonitoredResources.AWS_EC2_INSTANCE;
export type MonitoredResourceMetadata = Record<string, string>|string;

export interface MonitoredResource {
  readonly type: MonitoredResourceType;
  getLabels(): MonitoredResourceMetadata;
}

export declare let monitoredResourceMetadata: Record<string, string>;