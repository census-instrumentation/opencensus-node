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

/**
 * This module contains the functions for serializing and deserializing
 * TagMap (TagContext) with W3C Correlation Context as the HTTP text format.
 * It allows tags to propagate across requests.
 *
 * OpenCensus uses W3C Correlation Context as the HTTP text format.
 * https://github.com/w3c/correlation-context/blob/master/correlation_context/HTTP_HEADER_FORMAT.md
 */

import { TagMap } from '../tag-map';
import { TagKey, TagTtl, TagValue, TagValueWithMetadata } from '../types';

export const MAX_NUMBER_OF_TAGS = 180;
const TAG_SERIALIZED_SIZE_LIMIT = 4096;
const TAGMAP_SERIALIZED_SIZE_LIMIT = 8192;
const TAG_KEY_VALUE_DELIMITER = '=';
const TAG_DELIMITER = ',';
const UNLIMITED_PROPAGATION_MD = {
  tagTtl: TagTtl.UNLIMITED_PROPAGATION,
};

/**
 * Serializes a given TagMap to the on-the-wire format based on the W3C HTTP
 * text format standard.
 * @param tagMap The TagMap to serialize.
 */
export function serializeTextFormat(tagMap: TagMap): string {
  let ret = '';
  let totalChars = 0;
  let totalTags = 0;
  const tags = tagMap.tagsWithMetadata;
  tags.forEach((tagsWithMetadata: TagValueWithMetadata, tagKey: TagKey) => {
    if (tagsWithMetadata.tagMetadata.tagTtl !== TagTtl.NO_PROPAGATION) {
      if (ret.length > 0) ret += TAG_DELIMITER;
      totalChars += validateTag(tagKey, tagsWithMetadata.tagValue);
      ret +=
        tagKey.name + TAG_KEY_VALUE_DELIMITER + tagsWithMetadata.tagValue.value;
      totalTags++;
    }
  });

  if (totalTags > MAX_NUMBER_OF_TAGS) {
    throw new Error(
      `Number of tags in the TagMap exceeds limit ${MAX_NUMBER_OF_TAGS}`
    );
  }

  if (totalChars > TAGMAP_SERIALIZED_SIZE_LIMIT) {
    throw new Error(
      `Size of TagMap exceeds the maximum serialized size ${TAGMAP_SERIALIZED_SIZE_LIMIT}`
    );
  }

  return ret;
}

/**
 * Deserializes input to TagMap based on the W3C HTTP text format standard.
 * @param str The TagMap to deserialize.
 */
export function deserializeTextFormat(str: string): TagMap {
  const tags = new TagMap();
  if (!str) return tags;
  const listOfTags = str.split(TAG_DELIMITER);
  listOfTags.forEach(tag => {
    const keyValuePair = tag.split(TAG_KEY_VALUE_DELIMITER);
    if (keyValuePair.length !== 2) throw new Error(`Malformed tag ${tag}`);

    const [name, value] = keyValuePair;
    tags.set({ name }, { value }, UNLIMITED_PROPAGATION_MD);
  });
  return tags;
}

function validateTag(tagKey: TagKey, tagValue: TagValue) {
  const charsOfTag = tagKey.name.length + tagValue.value.length;
  if (charsOfTag > TAG_SERIALIZED_SIZE_LIMIT) {
    throw new Error(
      `Serialized size of tag exceeds limit ${TAG_SERIALIZED_SIZE_LIMIT}`
    );
  }
  return charsOfTag;
}
