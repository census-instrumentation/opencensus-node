/**
 * Represents an auto-detected monitored resource used by application for
 * exporting stats. It has a resource type associated with a mapping
 * from resource labels to values.
 */
import {AwsIdentityDocumentUtils} from './aws-identity-document-utils';
import {GcpMetadataConfig} from './gcp-metadata-config';
import * as types from './types';

/**
 * Represents gce_instance type monitored resource.
 * For definition refer to
 *  https://cloud.google.com/monitoring/api/resources#tag_gce_instance
 */
export class GcpGceMonitoredResource implements types.MonitoredResource {
  type = types.MonitoredResources.GCP_GCE_INSTANCE;

  getLabels() {
    const gcp = new GcpMetadataConfig();
    return gcp.getGceMetadata();
  }
}

/**
 * Represents gke_container type monitored resource.
 * For definition refer to
 *  https://cloud.google.com/monitoring/api/resources#tag_gke_container
 */
export class GcpGkeMonitoredResource implements types.MonitoredResource {
  type = types.MonitoredResources.GCP_GKE_CONTAINER;

  getLabels() {
    const gcp = new GcpMetadataConfig();
    return gcp.getGkeMetadata();
  }
}

/**
 * Represents aws_ec2_instance type monitored resource.
 * For definition refer to
 *  https://cloud.google.com/monitoring/api/resources#tag_aws_ec2_instance
 */
export class AwsMonitoredResource implements types.MonitoredResource {
  type = types.MonitoredResources.AWS_EC2_INSTANCE;

  getLabels() {
    const aws = new AwsIdentityDocumentUtils();
    return aws.getMetadata();
  }
}
