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

/**
 * Resource represents a resource, which capture identifying information about
 * the entities for which signals (stats or traces) are reported. It further
 * provides a framework for detection of resource information from the
 * environment and progressive population as signals propagate from the core
 * instrumentation library to a backend's exporter.
 */
export class Resource {
  /**
   * The type identifier for the resource.
   */
  private readonly type: string|null;
  /**
   * A map of labels that describe the resource.
   */
  private readonly labels: StringMap;

  private static readonly MAX_LENGTH = 255;
  private static readonly LABEL_LIST_SPLITTER = ',';
  private static readonly LABEL_KEY_VALUE_SPLITTER = '=';
  private static readonly ENV_TYPE =
      Resource.parseResourceType(process.env.OC_RESOURCE_TYPE);
  private static readonly ENV_LABEL_MAP =
      Resource.parseResourceLabels(process.env.OC_RESOURCE_LABELS);
  private static readonly ERROR_MESSAGE_INVALID_CHARS =
      'should be a ASCII string with a length greater than 0 and not exceed ' +
      Resource.MAX_LENGTH + ' characters.';
  private static readonly ERROR_MESSAGE_INVALID_VALUE =
      'should be a ASCII string with a length not exceed ' +
      Resource.MAX_LENGTH + ' characters.';

  constructor(type: string, labels: StringMap) {
    this.type = type;
    this.labels = labels;
  }

  /**
   * Returns a Resource. This resource information is loaded from the
   * OC_RESOURCE_TYPE and OC_RESOURCE_LABELS environment variables.
   *
   * @returns {Resource}
   */
  static createFromEnvironmentVariables(): Resource {
    return new Resource(Resource.ENV_TYPE, Resource.ENV_LABEL_MAP);
  }

  /**
   * Returns a Resource that runs all input resources sequentially and merges
   * their results. In case a type of label key is already set, the first set
   * value takes precedence.
   *
   * @param  {Resource[]} resources the list of the resources.
   * @returns {Resource}
   */
  static mergeResources(resources: Resource[]): Resource {
    let currentResource: Resource = null;
    for (const resource of resources) {
      currentResource = this.merge(currentResource, resource);
    }
    return currentResource;
  }

  /**
   * Returns the type identifier for the resource.
   *
   * @returns {string}
   */
  getType(): string {
    return this.type;
  }

  /**
   * Returns a map of labels that describe the resource.
   *
   * @returns {StringMap}
   */
  getLabels(): StringMap {
    return this.labels;
  }

  /**
   * Creates a resource type from the OC_RESOURCE_TYPE environment variable.
   *
   * <p>OC_RESOURCE_TYPE: A string that describes the type of the resource
   * prefixed by a domain namespace, e.g. “kubernetes.io/container”.
   */
  private static parseResourceType(rawEnvType: string): string {
    if (rawEnvType && rawEnvType != null) {
      if (!Resource.isValidAndNotEmpty(rawEnvType)) {
        throw new Error(`Type ${Resource.ERROR_MESSAGE_INVALID_CHARS}`);
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
   */
  private static parseResourceLabels(rawEnvLabels: string): StringMap {
    const labels: StringMap = {};
    if (rawEnvLabels && rawEnvLabels != null) {
      const rawLabels: string[] =
          rawEnvLabels.split(this.LABEL_LIST_SPLITTER, -1);
      for (const rawLabel of rawLabels) {
        const keyValuePair: string[] =
            rawLabel.split(this.LABEL_KEY_VALUE_SPLITTER, -1);
        if (keyValuePair.length !== 2) {
          continue;
        }
        const key: string = keyValuePair[0].trim();
        const value: string = keyValuePair[1].trim().replace('^"|"$', '');
        if (!Resource.isValidAndNotEmpty(key)) {
          throw new Error(`Label key ${Resource.ERROR_MESSAGE_INVALID_CHARS}`);
        }
        if (!Resource.isValid(value)) {
          throw new Error(
              `Label value ${Resource.ERROR_MESSAGE_INVALID_VALUE}`);
        }
        labels[key] = value;
      }
    }
    return labels;
  }

  /**
   * Returns a new, merged Resource by merging two resources. In case of
   * a collision, first resource takes precedence.
   */
  private static merge(resource: Resource, otherResource: Resource): Resource {
    if (resource == null) {
      return otherResource;
    }
    if (otherResource == null) {
      return resource;
    }
    const mergedType: string = resource.getType() != null ?
        resource.getType() :
        otherResource.getType();
    const mergedLabelMap: StringMap = otherResource.getLabels();

    const resourceLabels = resource.getLabels();
    for (const key of Object.keys(resourceLabels)) {
      const value = resourceLabels[key];
      mergedLabelMap[key] = value;
    }
    return new Resource(mergedType, mergedLabelMap);
  }


  /**
   * Determines whether the given String is a valid printable ASCII string with
   * a length not exceed MAX_LENGTH characters.
   */
  private static isValid(name: string): boolean {
    return name.length <= Resource.MAX_LENGTH &&
        StringUtils.isPrintableString(name);
  }

  /**
   * Determines whether the given String is a valid printable ASCII string with
   * a length greater than 0 and not exceed MAX_LENGTH characters.
   */
  private static isValidAndNotEmpty(name: string): boolean {
    return name && name.length > 0 && Resource.isValid(name);
  }
}

export interface StringMap { [key: string]: string; }
