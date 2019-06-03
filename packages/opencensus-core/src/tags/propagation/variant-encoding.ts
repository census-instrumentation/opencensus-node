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

// The MSB (most significant bit) indicates whether we've reached the end of
// the number. Set means there is more than one byte in the varint.
const MSB = 0x80;

// The REST indicates the lower 7 bits of each byte.
const REST = 0x7f;

/**
 * Encodes a number in a variable-length encoding, 7 bits per byte.
 * @param value The input number.
 */
export function EncodeVarint(value: number) {
  const ret: number[] = [];
  do {
    const bits = value & REST;
    value >>>= 7;
    const b = bits + (value !== 0 ? MSB : 0);
    ret.push(b);
  } while (value !== 0);
  return ret;
}

/**
 * Decodes a varint from buffer.
 * @param buffer The source buffer.
 * @param offset The offset within buffer.
 */
export function DecodeVarint(buffer: Buffer, offset: number) {
  let ret = 0;
  let shift = 0;
  let currentByte;
  let counter = offset;
  do {
    if (shift >= 32) {
      throw new Error('varint too long');
    }
    currentByte = buffer.readInt8(counter++);
    ret |= (currentByte & REST) << shift;
    shift += 7;
  } while ((currentByte & MSB) !== 0);
  return ret;
}
