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

import {AggregationData, AggregationType, CountData, DistributionData, LastValueData, Measurement, SumData} from './types';

export class Recorder {
  static addMeasurement(
      aggregationData: AggregationData,
      measurement: Measurement): AggregationData {
    switch (aggregationData.type) {
      case AggregationType.DISTRIBUTION:
        return this.addToDistribution(
            aggregationData as DistributionData, measurement);

      case AggregationType.SUM:
        return this.addToSum(aggregationData as SumData, measurement);

      case AggregationType.COUNT:
        return this.addToCount(aggregationData as CountData, measurement);

      default:
        return this.addToLastValue(
            aggregationData as LastValueData, measurement);
    }
  }

  private static addToDistribution(
      distributionData: DistributionData,
      measurement: Measurement): DistributionData {
    distributionData.timestamp = Date.now();

    distributionData.count += 1;

    const inletBucket = distributionData.buckets.find((bucket) => {
      return bucket.lowBoundary <= measurement.value &&
          measurement.value < bucket.highBoundary;
    });
    inletBucket.count += 1;

    if (measurement.value > distributionData.max) {
      distributionData.max = measurement.value;
    }

    if (measurement.value < distributionData.min) {
      distributionData.min = measurement.value;
    }

    if (distributionData.count === 1) {
      distributionData.mean = measurement.value;
    }

    distributionData.sum += measurement.value;

    const oldMean = distributionData.mean;
    distributionData.mean = distributionData.mean +
        (measurement.value - distributionData.mean) / distributionData.count;
    distributionData.sumSquaredDeviations =
        distributionData.sumSquaredDeviations +
        (measurement.value - oldMean) *
            (measurement.value - distributionData.mean);
    distributionData.stdDeviation = Math.sqrt(
        distributionData.sumSquaredDeviations / distributionData.count);

    return distributionData;
  }

  private static addToSum(sumData: SumData, measurement: Measurement): SumData {
    sumData.timestamp = Date.now();
    sumData.value += measurement.value;
    return sumData;
  }

  private static addToCount(countData: CountData, measurement: Measurement):
      CountData {
    countData.timestamp = Date.now();
    countData.value += 1;
    return countData;
  }

  private static addToLastValue(
      lastValueData: LastValueData, measurement: Measurement): LastValueData {
    lastValueData.timestamp = Date.now();
    lastValueData.value = measurement.value;
    return lastValueData;
  }
}