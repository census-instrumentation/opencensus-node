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
 * Common methods to encode and decode varints and varlongs into ByteBuffers
 * and arrays.
 */

/**
 * Returns the encoding size in bytes of its input value.
 *
 * @param i the integer to be measured
 * @return the encoding size in bytes of its input value
 */
export function varIntSize(i: number): number {
  let result = 0;
  do {
    result++;
    i >>>= 7;
  } while (i !== 0);
  return result;
}

/**
 * Encodes an integer in a variable-length encoding, 7 bits per byte, into a
 * destination byte[], following the protocol buffer convention.
 *
 * @param v the int value to write to sink
 * @param sink the sink buffer to write to
 * @param offset the offset within sink to begin writing
 * @return the updated offset after writing the varint
 */
export function putVarInt(v: number, sink: Int8Array, offset: number): number {
  do {
    const bits = v & 0x7F;
    v >>>= 7;
    const b = bits + ((v !== 0) ? 0x80 : 0);
    sink[offset++] = b;
  } while (v !== 0);
  return offset;
}

/**
 * Reads a varint from src, places its values into the first element of dst
 * and returns the offset in to src of the first byte after the varint.
 *
 * @param src source buffer to retrieve from
 * @param offset offset within src
 * @param dst the resulting int value
 * @return the updated offset after reading the varint
 */
export function getVarInt(
    src: Int8Array, offset: number, dst: number[]): number {
  let result = 0;
  let shift = 0;
  let b;
  do {
    if (shift >= 32) {
      throw new Error('Varint too long');
    }
    b = src[offset++];
    result |= (b & 0x7F) << shift;
    shift += 7;
  } while ((b & 0x80) !== 0);
  dst[0] = result;
  return offset;
}
