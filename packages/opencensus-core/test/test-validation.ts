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
import { isValidTagKey, isValidTagValue } from '../src/tags/validation';

describe('isValidTagKey()', () => {
  it('should return true when tag key is valid', () => {
    const tagKey = { name: 'key1' };
    assert.ok(isValidTagKey(tagKey));
  });

  it('should return false when tag key is 0 character long', () => {
    const tagKey = { name: '' };
    assert.strictEqual(isValidTagKey(tagKey), false);
  });

  it('should return false when the tag key length is longer than 255 characters ', () => {
    const tagKey = { name: 'a'.repeat(256) };
    assert.strictEqual(isValidTagKey(tagKey), false);
  });
});

describe('isValidTagValue()', () => {
  it('should return true when tag value is valid', () => {
    const tagValue = { value: 'value1' };
    assert.ok(isValidTagValue(tagValue));
  });

  it('should not throw an error when tag value is 0 character long', () => {
    const tagValue = { value: '' };
    assert.ok(isValidTagValue(tagValue));
  });

  it('should return false when the tag value length is longer than 255 characters ', () => {
    const tagValue = { value: 'a'.repeat(256) };
    assert.strictEqual(isValidTagValue(tagValue), false);
  });
});
