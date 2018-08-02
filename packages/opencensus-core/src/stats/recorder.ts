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

import {AggregationData, AggregationType, CountData, DistributionData, LastValueData, Measurement, MeasureType, SumData} from './types';

export class Recorder {
  static addMeasurement(
      aggregationData: AggregationData,
      measurement: Measurement): AggregationData {
    aggregationData.timestamp = Date.now();
    const value = measurement.measure.type === MeasureType.DOUBLE ?
        measurement.value :
        Math.trunc(measurement.value);

    switch (aggregationData.type) {
      case AggregationType.DISTRIBUTION:
        return this.addToDistribution(aggregationData, value);

      case AggregationType.SUM:
        return this.addToSum(aggregationData, value);

      case AggregationType.COUNT:
        return this.addToCount(aggregationData, value);

      default:
        return this.addToLastValue(aggregationData, value);
    }
  }

  private static addToDistribution(
      distributionData: DistributionData, value: number): DistributionData {
    distributionData.count += 1;

    const inletBucket = distributionData.buckets.find((bucket) => {
      return bucket.lowBoundary <= value && value < bucket.highBoundary;
    });
    inletBucket.count += 1;

    if (value > distributionData.max) {
      distributionData.max = value;
    }

    if (value < distributionData.min) {
      distributionData.min = value;
    }

    if (distributionData.count === 1) {
      distributionData.mean = value;
    }

    distributionData.sum += value;

    const oldMean = distributionData.mean;
    distributionData.mean = distributionData.mean +
        (value - distributionData.mean) / distributionData.count;
    distributionData.sumSquaredDeviations =
        distributionData.sumSquaredDeviations +
        (value - oldMean) * (value - distributionData.mean);
    distributionData.stdDeviation = Math.sqrt(
        distributionData.sumSquaredDeviations / distributionData.count);

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

  private static addToLastValue(lastValueData: LastValueData, value: number):
      LastValueData {
    lastValueData.value = value;
    return lastValueData;
  }
}