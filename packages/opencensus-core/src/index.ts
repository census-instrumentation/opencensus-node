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

// types
export * from './trace/types';
export * from './trace/model/types';
export * from './trace/config/types';
export * from './trace/sampler/types';
export * from './trace/instrumentation/types';
export * from './trace/propagation/types';
export * from './exporters/types';
export * from './common/types';
export * from './metrics/types';
export * from './metrics/cumulative/types';
export * from './metrics/gauges/types';
export {
  Metric,
  MetricDescriptor,
  TimeSeries,
  MetricDescriptorType,
  LabelKey,
  LabelValue,
  Point as TimeSeriesPoint,
  DistributionValue,
  BucketOptions,
  Bucket as DistributionBucket,
  SummaryValue,
  Explicit,
  Exemplar,
  Timestamp,
  Snapshot,
  ValueAtPercentile,
  MetricProducerManager,
  MetricProducer,
} from './metrics/export/types';

// classes

// domain models impls
export * from './trace/model/tracer-base';
export * from './trace/model/tracer';

// sampler impl
export * from './trace/sampler/sampler';

// base instrumetation class
export * from './trace/instrumentation/base-plugin';

// console exporter and buffer impls
export * from './exporters/exporter-buffer';
export * from './exporters/console-exporter';

// STATS CLASSES

// classes
export * from './stats/view';
export * from './stats/recorder';
export * from './stats/bucket-boundaries';
export * from './stats/metric-utils';
export * from './tags/tag-map';
export * from './tags/tagger';
export * from './tags/propagation/binary-serializer';
export * from './tags/propagation/text-format';
export * from './resource/resource';

// interfaces
export * from './stats/types';
export { TagKey, TagValue, TagMetadata, TagTtl } from './tags/types';
export * from './resource/types';

// logger
import * as logger from './common/console-logger';
export { logger };

// version
export * from './common/version';

// METRICS CLASSES

export * from './metrics/metrics';
export * from './metrics/metric-registry';

// Cumulative CLASSES
export * from './metrics/cumulative/cumulative';
export * from './metrics/cumulative/derived-cumulative';

// GAUGES CLASSES
export * from './metrics/gauges/derived-gauge';
export * from './metrics/gauges/gauge';

// Stats singleton instance
import { BaseStats } from './stats/stats';
import { Stats } from './stats/types';
const globalStats: Stats = BaseStats.instance;
export { globalStats };
