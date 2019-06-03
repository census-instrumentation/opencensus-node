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
import { TagMap, TagTtl } from '../src';
import {
  deserializeTextFormat,
  MAX_NUMBER_OF_TAGS,
  serializeTextFormat,
} from '../src/tags/propagation/text-format';

const K1 = {
  name: 'k1',
};
const K2 = {
  name: 'k2',
};

const V1 = {
  value: 'v1',
};
const V2 = {
  value: 'v2',
};

describe('Text Format Serializer', () => {
  const emptyTagMap = new TagMap();

  const singleTagMap = new TagMap();
  singleTagMap.set(K1, V1);

  const multipleTagMap = new TagMap();
  multipleTagMap.set(K1, V1);
  multipleTagMap.set(K2, V2);

  const NO_PROPAGATION_MD = { tagTtl: TagTtl.NO_PROPAGATION };
  const nonPropagatingTagMap = new TagMap();
  nonPropagatingTagMap.set(K1, V1, NO_PROPAGATION_MD);

  describe('serializeTextFormat', () => {
    it('should serialize empty tag map', () => {
      const textFormat = serializeTextFormat(emptyTagMap);
      assert.strictEqual(textFormat, '');
    });

    it('should serialize with one tag map', () => {
      const textFormat = serializeTextFormat(singleTagMap);
      assert.deepStrictEqual(textFormat, 'k1=v1');
    });

    it('should serialize with multiple tag', () => {
      const textFormat = serializeTextFormat(multipleTagMap);
      assert.deepStrictEqual(textFormat, 'k1=v1,k2=v2');
    });

    it('should skip non propagating tag', () => {
      const textFormat = serializeTextFormat(nonPropagatingTagMap);
      assert.deepStrictEqual(textFormat, '');
    });

    it('should throw an error when exceeds the max number of tags', () => {
      const tags = new TagMap();
      for (let i = 0; i < MAX_NUMBER_OF_TAGS + 1; i++) {
        tags.set({ name: `name-${i}` }, { value: `value-${i}` });
      }

      assert.throws(() => {
        serializeTextFormat(tags);
      }, /^Error: Number of tags in the TagMap exceeds limit 180/);
    });
  });

  describe('deserializeTextFormat', () => {
    it('should deserialize empty string', () => {
      const deserializedTagMap = deserializeTextFormat('');
      assert.deepStrictEqual(deserializedTagMap.tags.size, 0);
    });

    it('should deserialize with one key value pair', () => {
      const deserializedTagMap = deserializeTextFormat('k1=v1');
      assert.deepStrictEqual(deserializedTagMap.tags.size, 1);
      assert.deepStrictEqual(deserializedTagMap, singleTagMap);
    });

    it('should deserialize with multiple pairs', () => {
      const deserializedTagMap = deserializeTextFormat('k1=v1,k2=v2');
      assert.deepStrictEqual(deserializedTagMap.tags.size, 2);
      assert.deepStrictEqual(deserializedTagMap, multipleTagMap);
    });

    it('should deserialize with white spaces tag', () => {
      const expectedTagMap = new TagMap();
      expectedTagMap.set(K1, { value: ' v1' });
      expectedTagMap.set({ name: ' k2' }, { value: 'v 2' });

      const deserializedTagMap = deserializeTextFormat('k1= v1, k2=v 2');
      assert.deepStrictEqual(deserializedTagMap.tags.size, 2);
      assert.deepStrictEqual(deserializedTagMap, expectedTagMap);
    });

    it('should throw an error when tags are malformed', () => {
      assert.throws(() => {
        deserializeTextFormat('k1,v1,k2=v2');
      }, /^Error: Malformed tag k1/);
    });
  });
});
