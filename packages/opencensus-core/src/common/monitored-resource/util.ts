/**
 * Copyright 2018, OpenCensus Authors
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

import {AwsIdentityDocumentUtils} from './aws-identity-document-utils';
import {GcpMetadataConfig} from './gcp-metadata-config';
import * as resources from './monitored-resource';
import {MonitoredResource} from './types';

/**
 * Utilities for auto detecting monitored resource based on the
 * environment where the application is running.
 */
export class MonitoredResourceUtil {
  /**
   * Returns a self-configured monitored resource, or null if the application
   * is not running on a supported environment.
   */
  static getDefaultResource(): Promise<MonitoredResource|null> {
    return GcpMetadataConfig.run().then(metadata => {
      if (process.env['KUBERNETES_SERVICE_HOST']) {
        return new resources.GcpGkeMonitoredResource();
      }

      if (GcpMetadataConfig.isRunning()) {
        return new resources.GcpGceMonitoredResource();
      }

      return AwsIdentityDocumentUtils.run().then(() => {
        if (AwsIdentityDocumentUtils.isRunning()) {
          return new resources.AwsMonitoredResource();
        }
        return Promise.resolve(null);
      });
    });
  }
}
