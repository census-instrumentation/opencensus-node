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

import {
  LabelValue,
  MetricDescriptor,
  MetricDescriptorType,
} from '../metrics/export/types';
import { TagValue } from '../tags/types';
import { AggregationType, Measure, MeasureType, View } from './types';

/** Utils to convert Stats data models to Metric data models */
export class MetricUtils {
  /**
   * Gets the corresponding metric type for the given stats type.
   * @param measure The measure for which to find a metric type
   * @param aggregation The aggregation for which to find a metric type
   * @returns The Type of metric descriptor
   */
  private static getType(
    measure: Measure,
    aggregation: AggregationType
  ): MetricDescriptorType {
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
   * @returns The MetricDescriptor.
   */
  static viewToMetricDescriptor(view: View): MetricDescriptor {
    return {
      name: view.name,
      description: view.description,
      unit: view.measure.unit,
      type: MetricUtils.getType(view.measure, view.aggregation),
      labelKeys: view.getColumns().map(
        // TODO(mayurkale): add description
        tagKey => ({ key: tagKey.name, description: '' })
      ),
    };
  }

  /**
   * Converts tag values to label values.
   * @param tagValues the list of tag values
   * @returns The List of label values
   */
  static tagValuesToLabelValues(
    tagValues: Array<TagValue | null>
  ): LabelValue[] {
    return tagValues.map(tagValue => ({
      value: tagValue ? tagValue.value : null,
    }));
  }
}
