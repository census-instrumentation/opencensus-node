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
import * as VarInt from '../../internal/varint-utils';
import {TagMap} from '../tag-map';
import {TagKey, TagValue} from '../types';

export const VERSION_ID = 0;
export let TAG_FIELD_ID = 0;
// This size limit only applies to the bytes representing tag keys and values.
const TAG_MAP_SERIALIZED_SIZE_LIMIT = 8192;

// Serializes a TagMap to the on-the-wire format.
export function serializeBinary(tagMap: TagMap): Buffer {
  const result = Buffer.alloc(TAG_MAP_SERIALIZED_SIZE_LIMIT);
  let totalCharacters = 0;
  // const arr: Int8Array = new Int8Array([VERSION_ID]);
  result.writeInt32BE(VERSION_ID, result.byteLength);
  const tags = tagMap.tags;
  if (tags) {
    tags.forEach((value: TagValue, key: TagKey) => {
      totalCharacters += key.name.length;
      totalCharacters += value.value.length;
      encodeTag(key, value, result);
    });
  }
  if (totalCharacters > TAG_MAP_SERIALIZED_SIZE_LIMIT) {
    throw new Error(
        'Size of TagMap exceeds maximum serialized size' +
        TAG_MAP_SERIALIZED_SIZE_LIMIT);
  }
  return result;
}

function encodeTag(tagKey: TagKey, tagValue: TagValue, buffer: Buffer) {
  buffer.writeInt32BE(TAG_FIELD_ID, buffer.byteLength);
  encodeString(tagKey.name, buffer);
  encodeString(tagValue.value, buffer);
}

function encodeString(input: string, buffer: Buffer) {
  putVarInt(input.length, buffer);
  buffer.write(input, buffer.byteLength);
}

function putVarInt(input: number, buffer: Buffer) {
  const output: Int8Array = new Int8Array(VarInt.varIntSize(input));
  VarInt.putVarInt(input, output, 0);
  output.forEach(byte => {
    buffer.writeInt32BE(byte, buffer.byteLength);
  });
}
