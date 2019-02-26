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

// import {TextDecoder} from 'util';

import {VarInt} from '../../internal/util';
import {TagMap} from '../tag-map';
import {TagKey, TagValue} from '../types';

export let VERSION_ID = 0;
export let TAG_FIELD_ID = 0;
// This size limit only applies to the bytes representing tag keys and values.
const TAG_MAP_SERIALIZED_SIZE_LIMIT = 0;

// Serializes a TagMap to the on-the-wire format.
export function serializeBinary(tagMap: TagMap): Int8Array {
  let totalCharacters = 0;
  const arr: Int8Array = new Int8Array([VERSION_ID]);
  const tags = tagMap.tags;
  if (tags) {
    tags.forEach((value: TagValue, key: TagKey) => {
      totalCharacters += key.name.length;
      totalCharacters += value.value.toString().length;
      encodeTag(key, value, arr);
    });
  }
  if (totalCharacters > TAG_MAP_SERIALIZED_SIZE_LIMIT) {
    throw new Error(
        'Size of TagMap exceeds maximum serialized size' +
        TAG_MAP_SERIALIZED_SIZE_LIMIT);
  }
  return arr;
}

function encodeTag(tagKey: TagKey, tagValue: TagValue, byteArray: Int8Array) {
  byteArray = new Int8Array([...byteArray, TAG_FIELD_ID]);
  encodeString(tagKey.name, byteArray);
  encodeString(tagValue.value, byteArray);
}

function encodeString(input: string, byteArray: Int8Array) {
  putVarInt(input.length, byteArray);
  byteArray = new Int8Array([
    ...byteArray,
  ]);
}

function putVarInt(input: number, byteArray: Int8Array) {
  const output: Int8Array = new Int8Array(VarInt.varIntSize(input));
  VarInt.putVarInt(input, output, 0);
  byteArray = new Int8Array([...byteArray, ...output]);
}

// function decodeString(byteArray: Int8Array): string {
//   return new TextDecoder('utf-8').decode(byteArray);
// }