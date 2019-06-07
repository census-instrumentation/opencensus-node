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
 * TagMap (TagContext) with the binary format. It allows tags to propagate
 * across requests.
 *
 * <p>OpenCensus tag context encoding:
 *
 * <ul>
 *   <li>Tags are encoded in single byte sequence. The version 0 format is:
 *   <li>{@code <version_id><encoded_tags>}
 *   <li>{@code <version_id> -> a single byte, value 0}
 *   <li>{@code <encoded_tags> -> (<tag_field_id><tag_encoding>)*}
 *     <ul>
 *       <li>{@code <tag_field_id>} -> a single byte, value 0
 *       <li>{@code <tag_encoding>}:
 *         <ul>
 *           <li>{@code <tag_key_len><tag_key><tag_val_len><tag_val>}
 *             <ul>
 *               <li>{@code <tag_key_len>} -> varint encoded integer
 *               <li>{@code <tag_key>} -> tag_key_len bytes comprising tag name
 *               <li>{@code <tag_val_len>} -> varint encoded integer
 *               <li>{@code <tag_val>} -> tag_val_len bytes comprising tag value
 *             </ul>
 *           </li>
 *         </ul>
 *       </li>
 *     </ul>
 * </ul>
 */

import { TagMap } from '../tag-map';
import { TagKey, TagValue } from '../types';
import { DecodeVarint, EncodeVarint } from './variant-encoding';

// This size limit only applies to the bytes representing tag keys and values.
export const TAG_MAP_SERIALIZED_SIZE_LIMIT = 8192;

const ENCODING = 'utf8';
const VERSION_ID = 0;
const TAG_FIELD_ID = 0;
const VERSION_ID_INDEX = 0;

/**
 * Serializes a given TagMap to the on-the-wire format.
 * @param tagMap The TagMap to serialize.
 */
export function serializeBinary(tagMap: TagMap): Buffer {
  const byteArray: number[] = [];
  byteArray.push(VERSION_ID);
  let totalChars = 0;
  const tags = tagMap.tags;
  tags.forEach((tagValue: TagValue, tagKey: TagKey) => {
    totalChars += tagKey.name.length;
    totalChars += tagValue.value.length;
    encodeTag(tagKey, tagValue, byteArray);
  });

  if (totalChars > TAG_MAP_SERIALIZED_SIZE_LIMIT) {
    throw new Error(
      `Size of TagMap exceeds the maximum serialized size ${TAG_MAP_SERIALIZED_SIZE_LIMIT}`
    );
  }
  return Buffer.from(byteArray);
}

/**
 * Deserializes input to TagMap based on the binary format standard.
 * @param buffer The TagMap to deserialize.
 */
export function deserializeBinary(buffer: Buffer): TagMap {
  if (buffer.length === 0) {
    throw new Error('Input buffer can not be empty.');
  }
  const versionId = buffer.readInt8(VERSION_ID_INDEX);
  if (versionId > VERSION_ID) {
    throw new Error(
      `Wrong Version ID: ${versionId}. Currently supports version up to: ${VERSION_ID}`
    );
  }
  return parseTags(buffer);
}

function encodeTag(tagKey: TagKey, tagValue: TagValue, byteArray: number[]) {
  byteArray.push(TAG_FIELD_ID);
  encodeString(tagKey.name, byteArray);
  encodeString(tagValue.value, byteArray);
}

function encodeString(input: string, byteArray: number[]) {
  byteArray.push(...EncodeVarint(input.length));
  byteArray.push(...input.split('').map(unicode));
  return byteArray;
}

function parseTags(buffer: Buffer): TagMap {
  const tags = new TagMap();
  const limit = buffer.length;
  let totalChars = 0;
  let currentIndex = 1;

  while (currentIndex < limit) {
    const fieldId = buffer.readInt8(currentIndex);
    if (fieldId > TAG_FIELD_ID) {
      // Stop parsing at the first unknown field ID, since there is no way to
      // know its length.
      break;
    }
    currentIndex += 1;
    const key = decodeString(buffer, currentIndex);
    currentIndex += key.length;
    totalChars += key.length;

    currentIndex += 1;
    const val = decodeString(buffer, currentIndex);
    currentIndex += val.length;
    totalChars += val.length;

    currentIndex += 1;
    if (totalChars > TAG_MAP_SERIALIZED_SIZE_LIMIT) {
      throw new Error(
        `Size of TagMap exceeds the maximum serialized size ${TAG_MAP_SERIALIZED_SIZE_LIMIT}`
      );
    } else {
      tags.set({ name: key }, { value: val });
    }
  }
  return tags;
}

function decodeString(buffer: Buffer, offset: number): string {
  const length = DecodeVarint(buffer, offset);
  return buffer.toString(ENCODING, offset + 1, offset + 1 + length);
}

function unicode(x: string) {
  return x.charCodeAt(0);
}
