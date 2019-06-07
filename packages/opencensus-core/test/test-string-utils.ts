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
import { StringUtils } from '../src/internal/string-utils';

describe('StringUtils', () => {
  it('should return true when string is printable', () => {
    const isValid = StringUtils.isPrintableString('abcd');
    assert.deepStrictEqual(isValid, true);
  });

  it('should return false when string is not printable', () => {
    const isValid = StringUtils.isPrintableString('\x00-\xFF');
    assert.deepStrictEqual(isValid, false);
  });
});
