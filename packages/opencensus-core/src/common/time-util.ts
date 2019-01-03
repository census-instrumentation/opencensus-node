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
import * as BigInt from 'big-integer';
import {Timestamp} from '../metrics/export/types';

const MILLIS_PER_SECOND = 1e3;
const NANOS_PER_MILLI = 1e6;

/**
 * Creates a new timestamp from the given milliseconds.
 *
 * @param {number} epochMilli the timestamp represented in milliseconds since
 *  epoch.
 * @returns {Timestamp} new timestamp with specified fields.
 */
export function timestampFromMillis(epochMilli: number): Timestamp {
  return {seconds: seconds(epochMilli), nanos: nanos(epochMilli)};
}

const seconds = (epochMilli: number): number => {
  return Number(BigInt(epochMilli).divide(MILLIS_PER_SECOND).toString());
};

const nanos = (epochMilli: number): number => {
  const mos = epochMilli - seconds(epochMilli) * MILLIS_PER_SECOND;
  return Number(BigInt(mos).times(NANOS_PER_MILLI).toString());
};
