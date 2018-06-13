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

import {Aggregation, HistogramBucket, Measurement} from './types';

/** Counts the number of recorded measurements. */
export class AggregationCount implements Aggregation {
  measurements: Measurement[] = [];

  getValue(): number {
    return this.measurements.length;
  }

  getType(): string {
    return 'COUNT';
  }
}

/** Returns the recorded measurements values summed. */
export class AggregationSum implements Aggregation {
  measurements: Measurement[] = [];

  getValue(): number {
    let sum = 0;
    for (const measurement of this.measurements) {
      sum += measurement.value;
    }
    return sum;
  }

  getType(): string {
    return 'SUM';
  }
}

/** Returns the last recorded measurement value. */
export class AggregationLastValue implements Aggregation {
  measurements: Measurement[] = [];

  getValue(): number {
    return this.measurements[this.measurements.length - 1].value;
  }

  getType(): string {
    return 'LAST VALUE';
  }
}

/**
 * Returns a histogram distribution. A distribution Aggregation may contain a
 * histogram of the values in the population.
 */
export class AggregationDistribution implements Aggregation {
  private bucketBoundaries: number[];
  measurements: Measurement[] = [];

  constructor(bucketBoundaries: number[]) {
    this.bucketBoundaries = bucketBoundaries;
  }

  getValue(): HistogramBucket[] {
    const histograms = this.createHistogramBase();

    /** loop to calculate the bucket sizes */
    for (const measurement of this.measurements) {
      for (const histogram of histograms) {
        if (measurement.value < histogram.range.max) {
          histogram.bucketCount += 1;
          break;
        }
      }
    }

    return histograms;
  }

  getType(): string {
    return 'DISTRIBUTION';
  }

  /**
   * Creates the initial histogram with the bucket boundaries
   */
  private createHistogramBase(): HistogramBucket[] {
    const histogram: HistogramBucket[] = [];
    const bucketBoundaries = this.bucketBoundaries;

    // pushing the first value
    histogram.push(
        {range: {min: -Infinity, max: bucketBoundaries[0]}, bucketCount: 0});

    // pushing the second value to the penultimate value
    for (let i = 1; i < bucketBoundaries.length; i++) {
      histogram.push({
        range: {min: bucketBoundaries[i - 1], max: bucketBoundaries[i]},
        bucketCount: 0
      });
    }

    // pushing the last value
    histogram.push({
      range:
          {min: bucketBoundaries[bucketBoundaries.length - 1], max: Infinity},
      bucketCount: 0
    });

    return histogram;
  }
}
