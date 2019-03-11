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
import {TagMap} from '../src';
import * as tagger from '../src/tags/tagger';

describe('tagger()', () => {
  const tags = new TagMap();
  tags.set({name: 'key1'}, {value: 'value1'});
  tags.set({name: 'key2'}, {value: 'value2'});

  it('should return empty current tag context', () => {
    const tags = tagger.getCurrentTagMap();
    assert.equal(tags, tagger.EMPTY_TAG_MAP);
  });

  it('should return assigned current tag context', () => {
    tagger.setCurrentTagMap(tags);
    const currentTagMap = tagger.getCurrentTagMap();
    assert.deepStrictEqual(currentTagMap, tags);
  });

  it('should clear assigned current tag context', () => {
    tagger.setCurrentTagMap(tags);
    tagger.clear();

    const currentTagMap = tagger.getCurrentTagMap();
    assert.equal(currentTagMap, tagger.EMPTY_TAG_MAP);
  });
});
