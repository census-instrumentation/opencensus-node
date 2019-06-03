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

import * as defaultLogger from '../common/console-logger';
import * as loggerTypes from '../common/types';
import { Bucket } from './types';

export class BucketBoundaries {
  readonly buckets: Bucket[];
  readonly bucketCounts: number[];
  /** An object to log information to */
  private logger: loggerTypes.Logger;

  constructor(boundaries: number[], logger = defaultLogger) {
    this.logger = logger.logger();
    this.buckets = this.dropNegativeBucketBounds(boundaries);
    this.bucketCounts = this.getBucketCounts(this.buckets);
  }

  /**
   * Gets bucket boundaries
   */
  getBoundaries(): Bucket[] {
    return this.buckets;
  }

  /**
   * Gets initial bucket counts
   */
  getCounts(): number[] {
    return this.bucketCounts;
  }

  /**
   * Drops negative (BucketBounds) are currently not supported by
   * any of the backends that OC supports
   * @param bucketBoundaries a list with the bucket boundaries
   */
  private dropNegativeBucketBounds(bucketBoundaries: number[]): Bucket[] {
    let negative = 0;
    if (!bucketBoundaries) return [];
    const result = bucketBoundaries.reduce(
      (accumulator: number[], boundary: number, index: number) => {
        if (boundary > 0) {
          const nextBoundary = bucketBoundaries[index + 1];
          this.validateBoundary(boundary, nextBoundary);
          accumulator.push(boundary);
        } else {
          negative++;
        }
        return accumulator;
      },
      []
    );
    if (negative) {
      this.logger.warn(
        `Dropping ${negative} negative bucket boundaries, the values must be strictly > 0.`
      );
    }
    return result;
  }

  /**
   * Gets initial list of bucket counters
   * @param buckets Bucket boundaries
   */
  private getBucketCounts(buckets: Bucket[]): number[] {
    if (!buckets) return [];
    const bucketsCount = new Array(buckets.length + 1);
    bucketsCount.fill(0);
    return bucketsCount;
  }

  /**
   * Checks boundaries order and duplicates
   * @param current Boundary
   * @param next Next boundary
   */
  private validateBoundary(current: number, next: number) {
    if (next) {
      if (current > next) {
        this.logger.error('Bucket boundaries not sorted.');
      }
      if (current === next) {
        this.logger.error('Bucket boundaries not unique.');
      }
    }
  }
}
