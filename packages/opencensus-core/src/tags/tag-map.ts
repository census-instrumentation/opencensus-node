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

import {
  TagKey,
  TagMetadata,
  TagTtl,
  TagValue,
  TagValueWithMetadata,
} from './types';
import { isValidTagKey, isValidTagValue } from './validation';

const UNLIMITED_PROPAGATION_MD = {
  tagTtl: TagTtl.UNLIMITED_PROPAGATION,
};

/** TagMap is maps of TagKey -> TagValueWithMetadata */
export class TagMap {
  // A map mapping TagKey to to its respective TagValueWithMetadata.
  private readonly registeredTags: Map<
    TagKey,
    TagValueWithMetadata
  > = new Map();

  /**
   * Adds the key/value pair regardless of whether the key is present.
   * @param tagKey The TagKey which will be set.
   * @param tagValue The TagValue to set for the given key.
   * @param tagMetadata The TagMetadata associated with this Tag.
   */
  set(tagKey: TagKey, tagValue: TagValue, tagMetadata?: TagMetadata): void {
    if (!isValidTagKey(tagKey) || !isValidTagValue(tagValue)) return;
    let existingKey;
    for (const key of this.registeredTags.keys()) {
      if (key.name === tagKey.name) {
        existingKey = key;
        break;
      }
    }
    if (existingKey) this.registeredTags.delete(existingKey);
    const valueWithMetadata = this.getValueWithMetadata(tagValue, tagMetadata);
    this.registeredTags.set(tagKey, valueWithMetadata);
  }

  /**
   * Deletes a tag from the map if the key is in the map.
   * @param tagKey The TagKey which will be removed.
   */
  delete(tagKey: TagKey): void {
    this.registeredTags.delete(tagKey);
  }

  /** Gets the tags map without metadata. */
  get tags() {
    const tagsWithoutMetadata: Map<TagKey, TagValue> = new Map();
    for (const [tagKey, valueWithMetadata] of this.registeredTags) {
      tagsWithoutMetadata.set(tagKey, valueWithMetadata.tagValue);
    }
    return tagsWithoutMetadata;
  }

  /** Gets the tags map with metadata. */
  get tagsWithMetadata() {
    return this.registeredTags;
  }

  /**
   * Constructs a new TagValueWithMetadata using tagValue and tagMetadata.
   * For backwards-compatibility this method still produces propagating Tags
   * (UNLIMITED_PROPAGATION) if tagMetadata is not provided or missing.
   */
  private getValueWithMetadata(
    tagValue: TagValue,
    tagMetadata?: TagMetadata
  ): TagValueWithMetadata {
    if (tagMetadata) {
      return { tagValue, tagMetadata };
    }
    return { tagValue, tagMetadata: UNLIMITED_PROPAGATION_MD };
  }
}
