/**
 * Copyright 2018 Google LLC
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

// Code snippets from Stackdriver Trace Agent
// https://github.com/GoogleCloudPlatform/cloud-trace-nodejs

import * as crypto from 'crypto';

const SPAN_ID_RANDOM_BYTES = 8;

// Use the faster crypto.randomFillSync when available (Node 7+) falling back to
// using crypto.randomBytes.
const spanIdBuffer = Buffer.alloc(SPAN_ID_RANDOM_BYTES);
const randomFillSync = crypto.randomFillSync;
const randomBytes = crypto.randomBytes;
const spanRandomBuffer = randomFillSync ?
    () => randomFillSync(spanIdBuffer) :
    () => randomBytes(SPAN_ID_RANDOM_BYTES);

export function randomSpanId() {
  return spanRandomBuffer().toString('hex');
}

/**
 * Common methods to encode and decode varints and varlongs into ByteBuffers
 * and arrays.
 */
export class VarInt {
  static varIntSize(i: number): number {
    let result = 0;
    do {
      result++;
      i >>>= 7;
    } while (i !== 0);
    return result;
  }

  static putVarInt(v: number, sink: Int8Array, offset: number): number {
    do {
      const bits = v & 0x7F;
      v >>>= 7;
      const b = bits + ((v !== 0) ? 0x80 : 0);
      sink[offset++] = b;
    } while (v !== 0);
    return offset;
  }

  static getVarInt(src: Int8Array, offset: number, dst: number[]): number {
    let result = 0;
    let shift = 0;
    let b;
    do {
      if (shift >= 32) {
        throw new Error('varint too lond');
      }
      b = src[offset++];
      result |= (b & 0x7F) << shift;
      shift += 7;
    } while ((b & 0x80) !== 0);
    dst[0] = result;
    return offset;
  }
}
