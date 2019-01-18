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
import {isValidTagKey, isValidTagValue} from './validation';

/** TagMap is maps of TagKey -> TagValue */
export class TagMap {
  // A map mapping TagKey to to its respective TagValue.
  private readonly registeredTags: Map<TagKey, TagValue> = new Map();

  /**
   * Inserts a key and value in the map if the map does not already contain the
   * key.
   */
  insert(tagKey: TagKey, tagValue: TagValue): void {
    if (!isValidTagKey(tagKey)) {
      throw Error(`Invalid TagKey name: ${tagKey.name}`);
    }

    if (!isValidTagValue(tagValue)) {
      throw Error(`Invalid TagValue: ${tagValue.value}`);
    }

    if (!this.registeredTags.has(tagKey)) {
      this.registeredTags.set(tagKey, tagValue);
    }
  }

  /** Deletes a tag from the map if the key is in the map. */
  delete(tagKey: TagKey): void {
    this.registeredTags.delete(tagKey);
  }

  /** Updates the map by updating the value of a key. */
  update(tagKey: TagKey, tagValue: TagValue): void {
    if (this.registeredTags.has(tagKey)) {
      if (!isValidTagValue(tagValue)) {
        throw Error(`Invalid TagValue: ${tagValue.value}`);
      }
      this.registeredTags.set(tagKey, tagValue);
    }
  }

  /** Gets the tags map. */
  get tags() {
    return this.registeredTags;
  }
}
