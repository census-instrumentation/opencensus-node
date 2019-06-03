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
import { TagMap } from '../src';
import * as cls from '../src/internal/cls';
import * as tagger from '../src/tags/tagger';

const contextManager = cls.getNamespace();

describe('tagger()', () => {
  const tags1 = new TagMap();
  tags1.set({ name: 'key1' }, { value: 'value1' });
  tags1.set({ name: 'key2' }, { value: 'value2' });

  const tags2 = new TagMap();
  tags2.set({ name: 'key3' }, { value: 'value3' });
  tags2.set({ name: 'key4' }, { value: 'value4' });

  const tags3 = new TagMap();
  tags3.set({ name: 'key2' }, { value: 'value3' });
  tags3.set({ name: 'key4' }, { value: 'value4' });

  const tags4 = new TagMap();
  tags4.set({ name: 'key1' }, { value: 'value4' });
  tags4.set({ name: 'key4' }, { value: 'value5' });
  tags4.set({ name: 'key6' }, { value: 'value6' });

  const expectedMergedTags = new TagMap();
  expectedMergedTags.set({ name: 'key1' }, { value: 'value1' });
  expectedMergedTags.set({ name: 'key2' }, { value: 'value2' });
  expectedMergedTags.set({ name: 'key3' }, { value: 'value3' });
  expectedMergedTags.set({ name: 'key4' }, { value: 'value4' });

  const expectedTagsFrom1n3 = new TagMap();
  expectedTagsFrom1n3.set({ name: 'key1' }, { value: 'value1' });
  expectedTagsFrom1n3.set({ name: 'key2' }, { value: 'value3' });
  expectedTagsFrom1n3.set({ name: 'key4' }, { value: 'value4' });

  const expectedTagsFrom1n3n4 = new TagMap();
  expectedTagsFrom1n3n4.set({ name: 'key1' }, { value: 'value4' });
  expectedTagsFrom1n3n4.set({ name: 'key2' }, { value: 'value3' });
  expectedTagsFrom1n3n4.set({ name: 'key4' }, { value: 'value5' });
  expectedTagsFrom1n3n4.set({ name: 'key6' }, { value: 'value6' });

  it('should return empty current tag context', () => {
    tagger.withTagContext(contextManager, tagger.EMPTY_TAG_MAP, () => {
      assert.deepStrictEqual(
        tagger.getCurrentTagContext(contextManager),
        tagger.EMPTY_TAG_MAP
      );
    });
  });

  it('should set current tag context', () => {
    tagger.withTagContext(contextManager, tags1, () => {
      assert.deepStrictEqual(
        tagger.getCurrentTagContext(contextManager),
        tags1
      );
    });
    assert.deepStrictEqual(
      tagger.getCurrentTagContext(contextManager),
      tagger.EMPTY_TAG_MAP
    );
  });

  it('should set nested current tag context', () => {
    tagger.withTagContext(contextManager, tags1, () => {
      assert.deepStrictEqual(
        tagger.getCurrentTagContext(contextManager),
        tags1
      );

      tagger.withTagContext(contextManager, tags2, () => {
        assert.deepStrictEqual(
          tagger.getCurrentTagContext(contextManager),
          expectedMergedTags
        );
      });
      assert.deepStrictEqual(
        tagger.getCurrentTagContext(contextManager),
        tags1
      );
    });
    assert.deepStrictEqual(
      tagger.getCurrentTagContext(contextManager),
      tagger.EMPTY_TAG_MAP
    );
  });

  it('should resolve tag conflicts', () => {
    tagger.withTagContext(contextManager, tags1, () => {
      assert.deepStrictEqual(
        tagger.getCurrentTagContext(contextManager),
        tags1
      );

      tagger.withTagContext(contextManager, tags3, () => {
        assert.deepStrictEqual(
          tagger.getCurrentTagContext(contextManager),
          expectedTagsFrom1n3
        );

        tagger.withTagContext(contextManager, tags4, () => {
          assert.deepStrictEqual(
            tagger.getCurrentTagContext(contextManager),
            expectedTagsFrom1n3n4
          );
        });
      });
      assert.deepStrictEqual(
        tagger.getCurrentTagContext(contextManager),
        tags1
      );
    });
    assert.deepStrictEqual(
      tagger.getCurrentTagContext(contextManager),
      tagger.EMPTY_TAG_MAP
    );
  });

  it('should clear current tag context', () => {
    tagger.withTagContext(contextManager, tags1, () => {
      assert.deepStrictEqual(
        tagger.getCurrentTagContext(contextManager),
        tags1
      );
      tagger.clear(contextManager);
      assert.deepStrictEqual(
        tagger.getCurrentTagContext(contextManager),
        tagger.EMPTY_TAG_MAP
      );
    });
    assert.deepStrictEqual(
      tagger.getCurrentTagContext(contextManager),
      tagger.EMPTY_TAG_MAP
    );
  });
});
