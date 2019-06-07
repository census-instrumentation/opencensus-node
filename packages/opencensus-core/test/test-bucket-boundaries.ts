/**
 * Copyright 2018, OpenCensus Authors
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
import { BucketBoundaries } from '../src';

describe('BucketBoundaries', () => {
  it('should return boundaries', () => {
    const buckets = new BucketBoundaries([1, 2, 3]);
    assert.deepStrictEqual(buckets.getBoundaries(), [1, 2, 3]);
  });

  it('should has bucket counts', () => {
    const buckets = new BucketBoundaries([1, 2, 3]);
    assert.deepStrictEqual(buckets.getCounts(), [0, 0, 0, 0]);
  });

  describe('Drop negative and 0 boundaries', () => {
    const buckets = new BucketBoundaries([-Infinity, -3, -2, -1, 0, 1, 2, 3]);
    it('should drop negative and 0 boundaries', () => {
      assert.deepStrictEqual(buckets.getBoundaries(), [1, 2, 3]);
    });
    it('should has bucket counts', () => {
      assert.deepStrictEqual(buckets.getCounts(), [0, 0, 0, 0]);
    });
  });
});
