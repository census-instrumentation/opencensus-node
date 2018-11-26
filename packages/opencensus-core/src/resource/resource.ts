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

import {StringUtils} from '../internal/string-utils';
import {Resource} from './types';

/**
 * Resource represents a resource, which capture identifying information about
 * the entities for which signals (stats or traces) are reported. It further
 * provides a framework for detection of resource information from the
 * environment and progressive population as signals propagate from the core
 * instrumentation library to a backend's exporter.
 */
export class CoreResource {
  // Type, label keys, and label values should not exceed 256 characters.
  private static readonly MAX_LENGTH = 255;
  private static readonly COMMA_SEPARATOR = ',';
  private static readonly LABEL_KEY_VALUE_SPLITTER = '=';
  private static readonly ENV_TYPE =
      CoreResource.parseResourceType(process.env.OC_RESOURCE_TYPE);
  private static readonly ENV_LABEL_MAP =
      CoreResource.parseResourceLabels(process.env.OC_RESOURCE_LABELS);
  private static readonly ERROR_MESSAGE_INVALID_CHARS =
      'should be a ASCII string with a length greater than 0 and not exceed ' +
      CoreResource.MAX_LENGTH + ' characters.';
  private static readonly ERROR_MESSAGE_INVALID_VALUE =
      'should be a ASCII string with a length not exceed ' +
      CoreResource.MAX_LENGTH + ' characters.';

  /**
   * Returns a Resource. This resource information is loaded from the
   * OC_RESOURCE_TYPE and OC_RESOURCE_LABELS environment variables.
   *
   * @returns {Resource} The resource.
   */
  static createFromEnvironmentVariables(): Resource {
    return {type: CoreResource.ENV_TYPE, labels: CoreResource.ENV_LABEL_MAP};
  }

  /**
   * Returns a Resource that runs all input resources sequentially and merges
   * their results. In case a type of label key is already set, the first set
   * value takes precedence.
   *
   * @param  {Resource[]} resources The list of the resources.
   * @returns {Resource} The resource.
   */
  static mergeResources(resources: Resource[]): Resource {
    let currentResource: Resource;
    for (const resource of resources) {
      currentResource = this.merge(currentResource, resource);
    }
    return currentResource;
  }

  /**
   * Creates a resource type from the OC_RESOURCE_TYPE environment variable.
   *
   * <p>OC_RESOURCE_TYPE: A string that describes the type of the resource
   * prefixed by a domain namespace, e.g. “kubernetes.io/container”.
   *
   * @param  {string} rawEnvType The resource type.
   * @returns {string} The sanitized resource type.
   */
  private static parseResourceType(rawEnvType: string): string {
    if (rawEnvType) {
      if (!CoreResource.isValidAndNotEmpty(rawEnvType)) {
        throw new Error(`Type ${CoreResource.ERROR_MESSAGE_INVALID_CHARS}`);
      }
      return rawEnvType.trim();
    }
    return null;
  }

  /**
   * Creates a label map from the OC_RESOURCE_LABELS environment variable.
   *
   * <p>OC_RESOURCE_LABELS: A comma-separated list of labels describing the
   * source in more detail, e.g. “key1=val1,key2=val2”. Domain names and paths
   * are accepted as label keys. Values may be quoted or unquoted in general. If
   * a value contains whitespaces, =, or " characters, it must always be quoted.
   *
   * @param {string} rawEnvLabels The resource labels as a comma-seperated list
   * of key/value pairs.
   * @returns {[key: string]: string} The sanitized resource labels.
   */
  private static parseResourceLabels(rawEnvLabels: string):
      {[key: string]: string;} {
    const labels: {[key: string]: string;} = {};
    if (rawEnvLabels) {
      const rawLabels: string[] = rawEnvLabels.split(this.COMMA_SEPARATOR, -1);
      let key, value;
      for (const rawLabel of rawLabels) {
        const keyValuePair: string[] =
            rawLabel.split(this.LABEL_KEY_VALUE_SPLITTER, -1);
        if (keyValuePair.length !== 2) {
          continue;
        }
        [key, value] = keyValuePair;
        // Leading and trailing whitespaces are trimmed.
        key = key.trim();
        value = value.trim().split('^"|"$').join('');
        if (!CoreResource.isValidAndNotEmpty(key)) {
          throw new Error(
              `Label key ${CoreResource.ERROR_MESSAGE_INVALID_CHARS}`);
        }
        if (!CoreResource.isValid(value)) {
          throw new Error(
              `Label value ${CoreResource.ERROR_MESSAGE_INVALID_VALUE}`);
        }
        labels[key] = value;
      }
    }
    return labels;
  }

  /**
   * Returns a new, merged Resource by merging two resources. In case of
   * a collision, first resource takes precedence.
   *
   * @param {Resource} resource The resource object.
   * @param {Resource} otherResource The resource object.
   * @returns {Resource} A new, merged Resource.
   */
  private static merge(resource: Resource, otherResource: Resource): Resource {
    if (!resource) {
      return otherResource;
    }
    if (!otherResource) {
      return resource;
    }
    return {
      type: resource.type || otherResource.type,
      labels: Object.assign(otherResource.labels, resource.labels)
    };
  }


  /**
   * Determines whether the given String is a valid printable ASCII string with
   * a length not exceed MAX_LENGTH characters.
   *
   * @param {string} str The String to be validated.
   * @returns {boolean} Whether the String is valid.
   */
  private static isValid(name: string): boolean {
    return name.length <= CoreResource.MAX_LENGTH &&
        StringUtils.isPrintableString(name);
  }

  /**
   * Determines whether the given String is a valid printable ASCII string with
   * a length greater than 0 and not exceed MAX_LENGTH characters.
   *
   * @param {string} str The String to be validated.
   * @returns {boolean} Whether the String is valid and not empty.
   */
  private static isValidAndNotEmpty(name: string): boolean {
    return name && name.length > 0 && CoreResource.isValid(name);
  }
}
