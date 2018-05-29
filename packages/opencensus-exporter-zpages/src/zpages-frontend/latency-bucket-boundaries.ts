/**
 * Copyright 2018 OpenCensus Authors.
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

const timeunit = require('timeunit');

/** Manager the latency list */
export class LatencyBucketBoundaries {
  private latencyLowerNs: number;
  private latencyUpperNs: number;

  // Using the opencensus java standard names
  /* tslint:disable:variable-name */
  static readonly ZERO_MICROSx10 =
      new LatencyBucketBoundaries(0, timeunit.microseconds.toNanos(10));
  static readonly MICROSx10_MICROSx100 = new LatencyBucketBoundaries(
      timeunit.microseconds.toNanos(10), timeunit.microseconds.toNanos(100));
  static readonly MICROSx100_MILLIx1 = new LatencyBucketBoundaries(
      timeunit.microseconds.toNanos(100), timeunit.milliseconds.toNanos(1));
  static readonly MILLIx1_MILLIx10 = new LatencyBucketBoundaries(
      timeunit.milliseconds.toNanos(1), timeunit.milliseconds.toNanos(10));
  static readonly MILLIx10_MILLIx100 = new LatencyBucketBoundaries(
      timeunit.milliseconds.toNanos(10), timeunit.milliseconds.toNanos(100));
  static readonly MILLIx100_SECONDx1 = new LatencyBucketBoundaries(
      timeunit.milliseconds.toNanos(100), timeunit.seconds.toNanos(1));
  static readonly SECONDx1_SECONDx10 = new LatencyBucketBoundaries(
      timeunit.seconds.toNanos(1), timeunit.seconds.toNanos(10));
  static readonly SECONDx10_SECONDx100 = new LatencyBucketBoundaries(
      timeunit.seconds.toNanos(10), timeunit.seconds.toNanos(100));
  static readonly SECONDx100_MAX = new LatencyBucketBoundaries(
      timeunit.seconds.toNanos(100), Number.MAX_VALUE);
  /* tslint:enable */

  constructor(latencyLowerNs: number, latencyUpperNs: number) {
    this.latencyLowerNs = latencyLowerNs;
    this.latencyUpperNs = latencyUpperNs;
  }

  /** Return latency list */
  static values() {
    return [
      LatencyBucketBoundaries.ZERO_MICROSx10,
      LatencyBucketBoundaries.MICROSx10_MICROSx100,
      LatencyBucketBoundaries.MICROSx100_MILLIx1,
      LatencyBucketBoundaries.MILLIx1_MILLIx10,
      LatencyBucketBoundaries.MILLIx10_MILLIx100,
      LatencyBucketBoundaries.MILLIx100_SECONDx1,
      LatencyBucketBoundaries.SECONDx1_SECONDx10,
      LatencyBucketBoundaries.SECONDx10_SECONDx100,
      LatencyBucketBoundaries.SECONDx100_MAX,
    ];
  }

  /**
   * Check if a time belongs to a LatencyBucketBoundary
   * @param timeNs Time to compare in nanoseconds
   */
  belongs(timeNs: number): boolean {
    return timeNs >= this.latencyLowerNs && timeNs <= this.latencyUpperNs;
  }

  /** Convert a latency to string  */
  toString() {
    switch (this) {
      case LatencyBucketBoundaries.ZERO_MICROSx10:
        return '>0us';
      case LatencyBucketBoundaries.MICROSx10_MICROSx100:
        return '>10us';
      case LatencyBucketBoundaries.MICROSx100_MILLIx1:
        return '>100us';
      case LatencyBucketBoundaries.MILLIx1_MILLIx10:
        return '>1ms';
      case LatencyBucketBoundaries.MILLIx10_MILLIx100:
        return '>10ms';
      case LatencyBucketBoundaries.MILLIx100_SECONDx1:
        return '>100ms';
      case LatencyBucketBoundaries.SECONDx1_SECONDx10:
        return '>1s';
      case LatencyBucketBoundaries.SECONDx10_SECONDx100:
        return '>10s';
      case LatencyBucketBoundaries.SECONDx100_MAX:
        return '>100s';
      default:
        return null;
    }
  }

  /** Get latency name */
  getName() {
    switch (this) {
      case LatencyBucketBoundaries.ZERO_MICROSx10:
        return 'ZERO_MICROSx10';
      case LatencyBucketBoundaries.MICROSx10_MICROSx100:
        return 'MICROSx10_MICROSx100';
      case LatencyBucketBoundaries.MICROSx100_MILLIx1:
        return 'MICROSx100_MILLIx1';
      case LatencyBucketBoundaries.MILLIx1_MILLIx10:
        return 'MILLIx1_MILLIx10';
      case LatencyBucketBoundaries.MILLIx10_MILLIx100:
        return 'MILLIx10_MILLIx100';
      case LatencyBucketBoundaries.MILLIx100_SECONDx1:
        return 'MILLIx100_SECONDx1';
      case LatencyBucketBoundaries.SECONDx1_SECONDx10:
        return 'SECONDx1_SECONDx10';
      case LatencyBucketBoundaries.SECONDx10_SECONDx100:
        return 'SECONDx10_SECONDx100';
      case LatencyBucketBoundaries.SECONDx100_MAX:
        return 'SECONDx100_MAX';
      default:
        return null;
    }
  }
}
