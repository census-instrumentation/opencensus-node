/**
 * Copyright 2019, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 the "License";
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

import {TagKey, TagValue} from './types';

// String that has only printable characters
const invalidString = /[^\u0020-\u007e]/;

// Max Length of a TagKey
const MAX_LENGTH = 255;

/**
 * Determines whether the given String is a valid tag key.
 *
 * @param tagKey the name to be validated.
 * @return whether the name is valid.
 */
export function isValidTagKey(tagKey: TagKey): boolean {
  if (tagKey === null || typeof tagKey === 'undefined') {
    return false;
  }
  const name = tagKey.name;
  return name && isLegalCharacters(name) && name.length <= MAX_LENGTH;
}

/**
 * Determines whether the given String is a valid tag value.
 *
 * @param tagValue the name to be validated.
 * @return whether the name is valid.
 */

export function isValidTagValue(tagValue: TagValue): boolean {
  if (tagValue === null || typeof tagValue === 'undefined') {
    return false;
  }
  const value = tagValue.value;
  return isLegalCharacters(value) && value.length <= MAX_LENGTH;
}

function isLegalCharacters(name: string): boolean {
  return !invalidString.test(name);
}
