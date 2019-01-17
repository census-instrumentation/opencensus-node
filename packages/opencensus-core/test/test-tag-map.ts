/**
 * Copyright 2019, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 the "License";
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
import {TagMap} from '../src/tags/tag-map';

describe('TagMap()', () => {
  let tagMap: TagMap;
  const key1 = {name: 'key1'};
  const key2 = {name: 'key2'};
  const invalidKey1 = {name: 'a'.repeat(256)};
  const value1 = {value: 'value1'};
  const value2 = {value: 'value2'};
  const invalidValue1 = {value: 'a'.repeat(256)};

  beforeEach(() => {
    tagMap = new TagMap();
  });

  describe('insert()', () => {
    it('should insert tagkey and tagvalue', () => {
      tagMap.insert(key1, value1);
      const tags = tagMap.tags;
      assert.equal(tags.size, 1);
      assert.deepStrictEqual(tags.get(key1), value1);
    });

    it('should throw an error when invalid tagKey', () => {
      assert.throws(() => {
        tagMap.insert(invalidKey1, value1);
      }, /^Error: Invalid TagKey name:/);
    });

    it('should throw an error when invalid tagValue', () => {
      assert.throws(() => {
        tagMap.insert(key1, invalidValue1);
      }, /^Error: Invalid TagValue:/);
    });

    it('should not insert duplicate tagkey and tagvalue', () => {
      tagMap.insert(key1, value1);
      const tags = tagMap.tags;
      assert.equal(tags.size, 1);
      tagMap.insert(key1, value1);
      assert.equal(tags.size, 1);
    });
  });
  describe('update()', () => {
    it('should delete tagkey', () => {
      tagMap.insert(key1, value1);
      const tags = tagMap.tags;
      assert.equal(tags.size, 1);
      tagMap.delete(key1);
      assert.equal(tags.size, 0);
    });
    it('should delete missing tagkey1', () => {
      tagMap.insert(key1, value1);
      const tags = tagMap.tags;
      assert.equal(tags.size, 1);
      tagMap.delete(key2);
      assert.equal(tags.size, 1);
    });
  });

  describe('update()', () => {
    it('should update tagkey', () => {
      tagMap.insert(key1, value1);
      const tags = tagMap.tags;
      assert.equal(tags.size, 1);
      assert.deepStrictEqual(tags.get(key1), value1);
      tagMap.update(key1, value2);
      assert.equal(tags.size, 1);
      assert.deepStrictEqual(tags.get(key1), value2);
    });

    it('should throw an error when update invalid tagValue', () => {
      tagMap.insert(key1, value1);
      const tags = tagMap.tags;
      assert.equal(tags.size, 1);
      assert.deepStrictEqual(tags.get(key1), value1);
      assert.throws(() => {
        tagMap.update(key1, invalidValue1);
      }, /^Error: Invalid TagValue:/);
    });
  });
});
