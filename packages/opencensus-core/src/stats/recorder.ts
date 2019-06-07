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

import { TagKey, TagValue } from '../tags/types';
import {
  AggregationData,
  AggregationType,
  CountData,
  DistributionData,
  LastValueData,
  Measurement,
  MeasureType,
  SumData,
} from './types';

const UNKNOWN_TAG_VALUE: TagValue | null = null;

export class Recorder {
  static addMeasurement(
    aggregationData: AggregationData,
    measurement: Measurement,
    attachments?: { [key: string]: string }
  ): AggregationData {
    aggregationData.timestamp = Date.now();
    const value =
      measurement.measure.type === MeasureType.DOUBLE
        ? measurement.value
        : Math.trunc(measurement.value);

    switch (aggregationData.type) {
      case AggregationType.DISTRIBUTION:
        return this.addToDistribution(aggregationData, value, attachments);

      case AggregationType.SUM:
        return this.addToSum(aggregationData, value);

      case AggregationType.COUNT:
        return this.addToCount(aggregationData, value);

      default:
        return this.addToLastValue(aggregationData, value);
    }
  }

  /** Gets the tag values from tags and columns */
  static getTagValues(
    tags: Map<TagKey, TagValue>,
    columns: TagKey[]
  ): Array<TagValue | null> {
    return columns.map(
      tagKey =>
        tags.get(tagKey) ||
        /** replace not found key values by null. */ UNKNOWN_TAG_VALUE
    );
  }

  private static addToDistribution(
    distributionData: DistributionData,
    value: number,
    attachments?: { [key: string]: string }
  ): DistributionData {
    distributionData.count += 1;

    let bucketIndex = distributionData.buckets.findIndex(
      bucket => bucket > value
    );

    if (bucketIndex < 0) {
      bucketIndex = distributionData.buckets.length;
    }

    if (
      distributionData.bucketCounts &&
      distributionData.bucketCounts.length > bucketIndex
    ) {
      distributionData.bucketCounts[bucketIndex] += 1;
    }

    if (distributionData.count === 1) {
      distributionData.mean = value;
    }

    distributionData.sum += value;

    const oldMean = distributionData.mean;
    distributionData.mean =
      distributionData.mean +
      (value - distributionData.mean) / distributionData.count;
    distributionData.sumOfSquaredDeviation =
      distributionData.sumOfSquaredDeviation +
      (value - oldMean) * (value - distributionData.mean);
    distributionData.stdDeviation = Math.sqrt(
      distributionData.sumOfSquaredDeviation / distributionData.count
    );

    // No implicit recording for exemplars - if there are no attachments
    // (contextual information), don't record exemplars.
    if (
      attachments &&
      distributionData.exemplars &&
      distributionData.exemplars.length > bucketIndex
    ) {
      distributionData.exemplars[bucketIndex] = {
        value,
        timestamp: distributionData.timestamp,
        attachments,
      };
    }
    return distributionData;
  }

  private static addToSum(sumData: SumData, value: number): SumData {
    sumData.value += value;
    return sumData;
  }

  private static addToCount(countData: CountData, value: number): CountData {
    countData.value += 1;
    return countData;
  }

  private static addToLastValue(
    lastValueData: LastValueData,
    value: number
  ): LastValueData {
    lastValueData.value = value;
    return lastValueData;
  }
}
