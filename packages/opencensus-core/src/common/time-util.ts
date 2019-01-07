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

import {Timestamp} from '../metrics/export/types';

const MILLIS_PER_SECOND = 1e3;
const NANOS_PER_MILLI = 1e3 * 1e3;
const NANOS_PER_SECOND = 1e3 * 1e3 * 1e3;

const hrtime = process.hrtime;
const origin = hrtime();

const refTime = Date.now();
const startSecs = Math.floor(refTime / MILLIS_PER_SECOND);
const startNanos = (refTime % MILLIS_PER_SECOND) * NANOS_PER_MILLI;

/**
 * Gets the current timestamp with seconds and nanoseconds.
 *
 * @returns {Timestamp} The Timestamp.
 */
export function getTimestampWithProcessHRTime(): Timestamp {
  const [offsetSecs, offsetNanos] = hrtime(origin);  // [seconds, nanoseconds]

  // determine drfit in seconds and nanoseconds
  const seconds = startSecs + offsetSecs;
  const nanos = startNanos + offsetNanos;

  // if nanos excess NANOS_PER_SECOND value.
  if (nanos >= NANOS_PER_SECOND) {
    return {seconds: seconds + 1, nanos: nanos % NANOS_PER_SECOND};
  }
  return {seconds, nanos};
}
