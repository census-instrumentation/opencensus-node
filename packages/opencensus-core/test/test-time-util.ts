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
import {
  getTimestampWithProcessHRTime,
  TEST_ONLY,
} from '../src/common/time-util';

describe('getTimestampWithProcessHRTime()', () => {
  const realHrtimeFn = process.hrtime;
  const realNowFn = Date.now;

  afterEach(() => {
    process.hrtime = realHrtimeFn;
    Date.now = realNowFn;
    // Reset the hrtime reference so that it uses a real clock again.
    TEST_ONLY.resetHrtimeFunctionCache();
  });

  it('should return timestamp with respect to now and process.hrtime', () => {
    // @ts-expect-error ts-migrate(2741) FIXME: Property 'bigint' is missing in type '() => [numbe... Remove this comment to see the full error message
    process.hrtime = () => [100, 1e7];
    Date.now = () => 1450000000000;
    // Force the clock to recalibrate the time offset with the mocked time
    TEST_ONLY.setHrtimeReference();

    const currentTime = getTimestampWithProcessHRTime();

    assert.deepStrictEqual(currentTime, { seconds: 1450000100, nanos: 1e7 });
  });

  it('should handle excess of nanos', () => {
    // @ts-expect-error ts-migrate(2741) FIXME: Property 'bigint' is missing in type '() => [numbe... Remove this comment to see the full error message
    process.hrtime = () => [100, 10000000012];
    Date.now = () => 1450000000000;
    // Force the clock to recalibrate the time offset with the mocked time
    TEST_ONLY.setHrtimeReference();

    const currentTime = getTimestampWithProcessHRTime();

    assert.deepStrictEqual(currentTime, { seconds: 1450000101, nanos: 12 });
  });
});
