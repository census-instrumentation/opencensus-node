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

/** Manager the latency list */
export class LatencyBucketBoundaries {
  private latencyLowerNs: number;
  private latencyUpperNs: number;

  // Using the opencensus java standard names
  /* tslint:disable:variable-name */
  static readonly ZERO_MICROSx10 = new LatencyBucketBoundaries(
      0, LatencyBucketBoundaries.microsecondsToNanos(10));
  static readonly MICROSx10_MICROSx100 = new LatencyBucketBoundaries(
      LatencyBucketBoundaries.microsecondsToNanos(10),
      LatencyBucketBoundaries.microsecondsToNanos(100));
  static readonly MICROSx100_MILLIx1 = new LatencyBucketBoundaries(
      LatencyBucketBoundaries.microsecondsToNanos(100),
      LatencyBucketBoundaries.millisecondsToNanos(1));
  static readonly MILLIx1_MILLIx10 = new LatencyBucketBoundaries(
      LatencyBucketBoundaries.millisecondsToNanos(1),
      LatencyBucketBoundaries.millisecondsToNanos(10));
  static readonly MILLIx10_MILLIx100 = new LatencyBucketBoundaries(
      LatencyBucketBoundaries.millisecondsToNanos(10),
      LatencyBucketBoundaries.millisecondsToNanos(100));
  static readonly MILLIx100_SECONDx1 = new LatencyBucketBoundaries(
      LatencyBucketBoundaries.millisecondsToNanos(100),
      LatencyBucketBoundaries.secondsToNanos(1));
  static readonly SECONDx1_SECONDx10 = new LatencyBucketBoundaries(
      LatencyBucketBoundaries.secondsToNanos(1),
      LatencyBucketBoundaries.secondsToNanos(10));
  static readonly SECONDx10_SECONDx100 = new LatencyBucketBoundaries(
      LatencyBucketBoundaries.secondsToNanos(10),
      LatencyBucketBoundaries.secondsToNanos(100));
  static readonly SECONDx100_MAX = new LatencyBucketBoundaries(
      LatencyBucketBoundaries.secondsToNanos(100), Number.MAX_VALUE);
  /* tslint:enable */

  /** Latency list */
  static readonly values = [
    LatencyBucketBoundaries.ZERO_MICROSx10,
    LatencyBucketBoundaries.MICROSx10_MICROSx100,
    LatencyBucketBoundaries.MICROSx100_MILLIx1,
    LatencyBucketBoundaries.MILLIx1_MILLIx10,
    LatencyBucketBoundaries.MILLIx10_MILLIx100,
    LatencyBucketBoundaries.MILLIx100_SECONDx1,
    LatencyBucketBoundaries.SECONDx1_SECONDx10,
    LatencyBucketBoundaries.SECONDx10_SECONDx100,
    LatencyBucketBoundaries.SECONDx100_MAX
  ];

  constructor(latencyLowerNs: number, latencyUpperNs: number) {
    this.latencyLowerNs = latencyLowerNs;
    this.latencyUpperNs = latencyUpperNs;
  }

  /**
   * Checks if a time belongs to a LatencyBucketBoundary
   * @param timeNs Time to compare in nanoseconds
   */
  belongs(timeNs: number): boolean {
    return timeNs >= this.latencyLowerNs && timeNs <= this.latencyUpperNs;
  }

  /** Converts a latency to string  */
  toString(): string {
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

  /** Gets latency name */
  getName(): string {
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

  /**
   * Gets the corresponding LatencyBucketBoundaries from a time in nanoseconds
   * @param timeNs time in nanoseconds
   */
  static getLatencyBucketBoundariesByTime(timeNs: number):
      LatencyBucketBoundaries {
    for (const latency of LatencyBucketBoundaries.values) {
      if (latency.belongs(timeNs)) {
        return latency;
      }
    }
    return null;
  }

  /**
   * Convert microseconds to nanoseconds
   * @param microseconds
   * @returns nanoseconds
   */
  private static microsecondsToNanos(microseconds: number): number {
    return microseconds * 1000;
  }

  /**
   * Convert milliseconds to nanoseconds
   * @param milliseconds
   * @returns nanoseconds
   */
  static millisecondsToNanos(milliseconds: number): number {
    return milliseconds * 1000000;
  }

  /**
   * Convert seconds to nanoseconds
   * @param seconds
   * @returns nanoseconds
   */
  static secondsToNanos(seconds: number): number {
    return seconds * 1e+9;
  }
}
