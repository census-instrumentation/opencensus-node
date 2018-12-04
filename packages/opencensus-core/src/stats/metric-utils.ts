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


import {LabelKey, LabelValue, MetricDescriptor, MetricDescriptorType} from '../metrics/export/types';

import {AggregationType, Measure, MeasureType, Tags, View} from './types';

/** Utils to convert Stats data models to Metric data models */
export class MetricUtils {
  /**
   * Gets the corresponding metric type for the given stats type.
   * @param measure The measure for which to find a metric type
   * @param aggregation The aggregation for which to find a metric type
   * @returns {MetricDescriptorType} Type of metric descriptor
   */
  private static getType(measure: Measure, aggregation: AggregationType):
      MetricDescriptorType {
    if (aggregation === AggregationType.SUM) {
      switch (measure.type) {
        case MeasureType.INT64:
          return MetricDescriptorType.CUMULATIVE_INT64;
        case MeasureType.DOUBLE:
          return MetricDescriptorType.CUMULATIVE_DOUBLE;
        default:
          throw new Error(`Unknown measure type ${measure.type}`);
      }
    } else if (aggregation === AggregationType.COUNT) {
      return MetricDescriptorType.CUMULATIVE_INT64;
    } else if (aggregation === AggregationType.DISTRIBUTION) {
      return MetricDescriptorType.CUMULATIVE_DISTRIBUTION;
    } else if (aggregation === AggregationType.LAST_VALUE) {
      switch (measure.type) {
        case MeasureType.INT64:
          return MetricDescriptorType.GAUGE_INT64;
        case MeasureType.DOUBLE:
          return MetricDescriptorType.GAUGE_DOUBLE;
        default:
          throw new Error(`Unknown measure type ${measure.type}`);
      }
    }
    throw new Error(`Unknown aggregation type ${aggregation}`);
  }

  /**
   * Gets a MetricDescriptor for given view.
   * @param view The view for which to build a metric descriptor
   * @returns {MetricDescriptor}
   */
  static viewToMetricDescriptor(view: View): MetricDescriptor {
    return {
      name: view.name,
      description: view.description,
      unit: view.measure.unit,
      type: MetricUtils.getType(view.measure, view.aggregation),
      labelKeys: view.getColumns().map(tag => ({key: tag} as LabelKey))
    };
  }

  /**
   * Converts tags to label values.
   * @param tags
   * @returns {LabelValue[]} List of label values
   */
  static tagsToLabelValues(tags: Tags): LabelValue[] {
    return Object.keys(tags).map(key => {
      return {value: tags[key]} as LabelValue;
    });
  }
}
