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

import {LabelKey, LabelValue} from '../metrics/export/types';

/**
 * Validates that an object reference passed as a parameter to the calling
 * method is not null.
 *
 * @param {T} reference An object reference.
 * @param {string} errorMessage The exception message to use if the check fails.
 * @returns {T} An object reference.
 */
export function validateNotNull<T>(reference: T, errorMessage: string): T {
  if (reference === null || reference === undefined) {
    throw new Error(`Missing mandatory ${errorMessage} parameter`);
  }
  return reference;
}

/**
 * Validates that an array passed as a parameter doesn't contain null element.
 *
 * @param {T} list The argument list to check for null.
 * @param {string} errorMessage The exception message to use if the check fails.
 */
export function validateArrayElementsNotNull<T>(
    array: T[], errorMessage: string) {
  const areAllDefined = array.every(
      element => element !== null && typeof element !== 'undefined');
  if (!areAllDefined) {
    throw new Error(`${errorMessage} elements should not be a NULL`);
  }
}

/** Throws an error if any of the map elements is null. */
export function validateMapElementNotNull<T>(
    map: Map<T, T>, errorMessage: string) {
  for (const [key, value] of map.entries()) {
    if (key === null || key === undefined || value === null ||
        value === undefined) {
      throw new Error(`${errorMessage} elements should not be a NULL`);
    }
  }
}

/** Throws an error if any of the array element present in the map. */
export function validateDuplicateKeys(
    keys: LabelKey[], map: Map<LabelKey, LabelValue>) {
  const keyNames: Set<string> = new Set();
  keys.forEach(key => keyNames.add(key.key));
  Array.from(map.keys()).forEach(key => keyNames.add(key.key));

  if (keyNames.size !== (keys.length + map.size)) {
    throw new Error(
        `The keys from LabelKeys should not be present in constantLabels`);
  }
}
