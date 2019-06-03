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

import * as assert from 'assert';
import {
  DecodeVarint,
  EncodeVarint,
} from '../src/tags/propagation/variant-encoding';

const testCases = [
  0,
  1,
  10,
  100,
  1000,
  10000,
  100000,
  1000000,
  10000000,
  100000000,
];

function randint(range: number) {
  return Math.floor(Math.random() * range);
}

describe('variant encoding', () => {
  it('should encode single byte', () => {
    const expected = randint(127);
    assert.deepStrictEqual(EncodeVarint(expected), [expected]);
  });

  it('should encode/decode multiple bytes', () => {
    const num = 300;
    const expectedBytes = [0xac, 0x02]; // [172, 2]

    const variant = EncodeVarint(num);
    assert.deepStrictEqual(variant, expectedBytes);
    const buff = Buffer.from(variant);
    assert.strictEqual(DecodeVarint(buff, 0), num);
  });

  for (const testCase of testCases) {
    it(`should encode and decode ${testCase} correctly`, () => {
      const variant = EncodeVarint(testCase);
      const buff = Buffer.from(variant);
      assert.strictEqual(DecodeVarint(buff, 0), testCase);
    });
  }
});
