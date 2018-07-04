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

import {AbstractHistogram, build as BuildHistogram} from 'hdr-histogram-js';

import * as logger from '../../../common/console-logger';
import {Logger} from '../../../common/types';
import {Measure, MeasureUnit, Tags} from '../types';

import {BaseMetric} from './metric';
import {Bucket, Distribution, HistogramBoundaries, MetricValuesTypes, SimpleRange} from './types';
import {HistogramMetricConfig, MetricDescriptor, MetricDistributions, MetricValues} from './types';
import {Histogram} from './types';

/**
 * Histograms can track the entire value distribution of a given metric.
 * Normally used for recording latency, sizes, and others.
 *
 * This implementation uses a Typescript version of a High Dynamic Range (HDR)
 * Histogram:
 *
 *  Java:       https://github.com/HdrHistogram/HdrHistogram
 *  Typescrpt:  https://github.com/HdrHistogram/HdrHistogramJS
 *
 * HdrHistogram is designed for recording histograms of value measurements in
 * latency and performance sensitive applications. It produce a unique data
 * structure capable of recording measurements with configurable precision and
 * fixed memory and CPU costs, regardless of the number of measurements
 * recorded.
 *
 */
export class HdrDefaultHistogram implements Histogram {
  private logger: Logger;
  localHistogram: AbstractHistogram;
  boundaries: HistogramBoundaries;
  sum = 0;

  constructor(boundaries: HistogramBoundaries, alogger?: Logger) {
    this.logger = alogger || logger.logger();
    this.boundaries = boundaries;
    this.localHistogram = BuildHistogram({
      bitBucketSize: 64,
      autoResize: true,
      lowestDiscernibleValue: 1,
      highestTrackableValue: boundaries ? boundaries.range.max : 10000,
      numberOfSignificantValueDigits: 3
    });
    this.localHistogram.startTimeStampMsec = Date.now();
  }

  /** Max value recorded in the histogram  */
  get max(): number {
    return this.localHistogram.maxValue;
  }

  /** Min value recorded in the histogram  */
  get min(): number {
    return this.localHistogram.minNonZeroValue;
  }

  /** When the histogram was created */
  get startTime(): number {
    return this.localHistogram.startTimeStampMsec;
  }
  /** Last time histogram was updated */
  get endTime(): number {
    return this.localHistogram.endTimeStampMsec;
  }

  record(value?: number, count?: number): void {
    this.sum += (value * (count ? count : 1));
    this.localHistogram.endTimeStampMsec = Date.now();
    this.localHistogram.recordValueWithCount(value, count ? count : 1);
  }

  /** Get the total count of all recorded values in the histogram */
  get count(): number {
    return this.localHistogram.getTotalCount();
  }

  /**
   * Get the value at a given percentile.
   * When the given percentile is &gt; 0.0, the value returned is the value that
   * the given percentage of the overall recorded value entries in the histogram
   * are either smaller than or equivalent to. When the given percentile is 0.0,
   * the value returned is the value that all value entries in the histogram are
   * either larger than or equivalent to.
   */
  getPercentile(percentile: number): number {
    return this.localHistogram.getValueAtPercentile(percentile);
  }

  /** Get the computed mean value of all recorded values in the histogram */
  get mean(): number {
    return this.localHistogram.getMean();
  }

  /**
   * Get the computed standard deviation of all recorded values in the
   * histogram
   */
  get stdDeviation(): number {
    return this.localHistogram.getStdDeviation();
  }

  /**  Add the contents of another histogram to this one. */
  add(otherHistogram: Histogram): void {
    // tslint:disable-next-line:no-any
    this.localHistogram.add(otherHistogram as any);
  }

  /** Subtract the contents of another histogram to this one. */
  subtract(otherHistogram: Histogram): void {
    // tslint:disable-next-line:no-any
    this.localHistogram.subtract(otherHistogram as any);
  }

  /**
   * Get the computed sum of squared deviations of all recorded values in the
   * histogram.
   *
   * For values x_i this is Sum[i=1..n]((x_i - mean)^2)
   *
   * Computed using Welfords method (see
   *  https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance, or
   * Knuth, "The Art of Computer Programming", Vol. 2, page 323, 3rd edition)
   */
  get sumSquaredDeviations() {
    if (this.count === 0) {
      return 0;
    }
    const mean = this.mean;
    let geometricDeviationTotal = 0.0;
    this.localHistogram.recordedValuesIterator.reset();
    while (this.localHistogram.recordedValuesIterator.hasNext()) {
      const iterationValue = this.localHistogram.recordedValuesIterator.next();
      const deviation = this.localHistogram.medianEquivalentValue(
                            iterationValue.valueIteratedTo) -
          mean;
      for (let i = 0; i < iterationValue.countAddedInThisIterationStep; i++) {
        geometricDeviationTotal += deviation * deviation;
      }
    }
    return geometricDeviationTotal;
  }

  /**
   * Snapshot value of the histogram
   */
  get value(): Distribution {
    return {
      startTime: this.startTime,
      endTime: this.endTime,
      count: this.count,
      sum: this.sum,
      max: this.max,
      min: this.min,
      mean: this.mean,
      stdDeviation: this.stdDeviation,
      sumSquaredDeviations: this.sumSquaredDeviations,
      boundaries: this.boundaries,
      buckets: this.getBuckets(),
      tags: {},
      type: MetricValuesTypes.distribution,
      labelKey: ''
    };
  }

  private getBuckets(): Bucket[] {
    const baseBuckets = this.createBaseBucketList();

    this.localHistogram.recordedValuesIterator.reset();
    while (this.localHistogram.recordedValuesIterator.hasNext()) {
      const iterationValue = this.localHistogram.recordedValuesIterator.next();
      const value = this.localHistogram.medianEquivalentValue(
          iterationValue.valueIteratedTo);

      for (const bucket of baseBuckets) {
        if (value < bucket.range.max) {
          bucket.count += iterationValue.countAddedInThisIterationStep;
          break;
        }
      }
    }
    return baseBuckets;
  }

  private createBaseBucketList(): Bucket[] {
    const buckets: Bucket[] = [];
    const bucketBoundaries = this.boundaries.bucketBoundaries;

    // pushing the first value
    buckets.push({range: {min: -Infinity, max: bucketBoundaries[0]}, count: 0});

    // pushing the second value to the penultimate value
    for (let i = 1; i < bucketBoundaries.length; i++) {
      buckets.push({
        range: {min: bucketBoundaries[i - 1], max: bucketBoundaries[i]},
        count: 0
      });
    }

    // pushing the last value
    buckets.push({
      range:
          {min: bucketBoundaries[bucketBoundaries.length - 1], max: Infinity},
      count: 0
    });

    return buckets;
  }

  reset(): void {
    this.sum = 0;
    this.localHistogram.reset();
  }
}

/**
 * HistogramMetric is a Metric implementation unsing HdrDefaultHistogram
 * Recorder Mechanism class
 */
export class HistogramMetric extends BaseMetric<Histogram> {
  readonly type = 'histogram';

  constructor(config: HistogramMetricConfig) {
    super(config);
  }

  get metricSnapshotValues(): MetricValues {
    const metricValues = this.keys.map((labelKey: string) => {
      const distribution = this.getRecorder(labelKey).value;
      distribution.tags = JSON.parse(labelKey);
      distribution.labelKey = labelKey;
      return distribution;
    });
    return metricValues;
  }

  record(value?: number, count?: number): void {
    this.labelValues().record(value, count ? count : 1);
  }

  protected createMetricHolder() {
    const histogramConfig = this.config as HistogramMetricConfig;
    return new HdrDefaultHistogram(histogramConfig.boundaries, this.logger);
  }
}
