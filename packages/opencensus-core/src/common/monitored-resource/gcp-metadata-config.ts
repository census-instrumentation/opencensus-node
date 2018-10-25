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

import {get} from 'http';
import {isString} from 'util';

import * as logger from '../../common/console-logger';
import * as loggerTypes from '../../common/types';

import {monitoredResourceAttributes} from './types';

export class GcpMetadataConfig {
  static URL = 'metadata/computeMetadata/v1';
  static PORT = 80;
  static readonly HEADER = {'Metadata-Flavor': 'Google'};
  /** Kubenertes environment variables */
  static readonly KUBERNETES_SERVICE_HOST = 'KUBERNETES_SERVICE_HOST';
  static runned = false;
  /** Persistant metadata */
  static metadata: Record<string, string> = {};
  static readonly logger: loggerTypes.Logger = logger.logger();
  static promise: Promise<Record<string, string>>;

  /**
   * Initializes metadata service once and load gcp metadata into map.
   */
  static run() {
    if (GcpMetadataConfig.runned) {
      return GcpMetadataConfig.promise;
    }
    GcpMetadataConfig.promise =
        GcpMetadataConfig.getAttribute('instance_id').then(id => {
          if (isString(id)) {
            GcpMetadataConfig.metadata['instance_id'] = id;
            GcpMetadataConfig.runned = true;
            return GcpMetadataConfig.getAttributes();
          }
          return Promise.resolve(GcpMetadataConfig.metadata);
        });
    return GcpMetadataConfig.promise;
  }

  private static getAttributes() {
    let attributes;
    if (GcpMetadataConfig.KUBERNETES_SERVICE_HOST in process.env) {
      attributes = monitoredResourceAttributes.GKE;
    } else {
      attributes = monitoredResourceAttributes.GCE;
    }
    const promises: Array<Promise<string>> = [];
    Object.keys(attributes)
        .filter(key => key !== 'instance_id')
        .forEach(key => {
          promises.push(GcpMetadataConfig.getAttribute(key).then(value => {
            if (value) {
              GcpMetadataConfig.metadata[key] = value;
            }
            return value;
          }));
        });
    return Promise.all(promises)
        .then(() => GcpMetadataConfig.metadata)
        .catch(e => e);
  }

  /**
   * Fetches the requested instance metadata entry.
   * @param name Attribute name relative to the computeMetadata/v1 prefix
   */
  static getAttribute(name: string): Promise<string> {
    const options = {
      host: GcpMetadataConfig.URL,
      path: '/' + monitoredResourceAttributes.GKE[name],
      port: GcpMetadataConfig.PORT,
      headers: GcpMetadataConfig.HEADER
    };
    const promise = new Promise((resolve, reject) => {
      try {
        get(options, response => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            let rawData = '';
            response.on('data', chunk => rawData += chunk);
            response.on('end', () => resolve(rawData));
          } else {
            const errorMessage =
                `Request Failed. Status code: ${response.statusCode}`;
            this.logger.error(errorMessage);
            response.resume();
            reject(errorMessage);
          }
        }).on('error', (e) => {
          reject(e);
        });
      } catch (e) {
        reject(e);
      }
    });
    return promise.catch(e => e);
  }

  /**
   * Gets metadata for GCP GCE instance.
   */
  getGceMetadata() {
    return GcpMetadataConfig.metadata;
  }

  /**
   * Gets metadata for GCP GKE container.
   */
  getGkeMetadata() {
    Object.keys(monitoredResourceAttributes.GKE).forEach(key => {
      const value = monitoredResourceAttributes.GKE[key];
      const attributeValue = process.env[value];
      if (attributeValue) {
        GcpMetadataConfig.metadata[key] = attributeValue;
      }
    });
    return GcpMetadataConfig.metadata;
  }

  static isRunning(): boolean {
    return GcpMetadataConfig.runned;
  }
}
