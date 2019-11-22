/**
 * Copyright 2019, OpenCensus Authors
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
  CoreResource,
  DistributionValue,
  LabelKey,
  LabelValue,
  MetricDescriptor as OCMetricDescriptor,
  MetricDescriptorType,
  TimeSeriesPoint,
  Timestamp,
} from '@opencensus/core';
import * as assert from 'assert';
import { getDefaultResource } from '../src/common-utils';
import { StackdriverStatsExporter } from '../src/stackdriver-monitoring';
import {
  createMetricDescriptorData,
  createTimeSeriesList,
  OPENCENSUS_TASK_VALUE_DEFAULT,
  TEST_ONLY,
} from '../src/stackdriver-monitoring-utils';
import {
  Distribution,
  MetricDescriptor,
  MetricKind,
  ValueType,
} from '../src/types';
import * as nocks from './nocks';

const METRIC_NAME = 'metric-name';
const METRIC_DESCRIPTION = 'metric-description';
const DEFAULT_UNIT = '1';

describe('Stackdriver Stats Exporter Utils', () => {
  describe('createMetricKind()', () => {
    it('should return a Stackdriver MetricKind', () => {
      assert.strictEqual(
        TEST_ONLY.createMetricKind(MetricDescriptorType.CUMULATIVE_INT64),
        MetricKind.CUMULATIVE
      );
      assert.strictEqual(
        TEST_ONLY.createMetricKind(MetricDescriptorType.GAUGE_INT64),
        MetricKind.GAUGE
      );
      assert.strictEqual(
        TEST_ONLY.createMetricKind(MetricDescriptorType.GAUGE_DOUBLE),
        MetricKind.GAUGE
      );
      assert.strictEqual(
        TEST_ONLY.createMetricKind(MetricDescriptorType.SUMMARY),
        MetricKind.UNSPECIFIED
      );
    });
  });

  describe('createValueType()', () => {
    it('should return a Stackdriver ValueType', () => {
      assert.strictEqual(
        TEST_ONLY.createValueType(MetricDescriptorType.GAUGE_DOUBLE),
        ValueType.DOUBLE
      );
      assert.strictEqual(
        TEST_ONLY.createValueType(MetricDescriptorType.CUMULATIVE_INT64),
        ValueType.INT64
      );
      assert.strictEqual(
        TEST_ONLY.createValueType(MetricDescriptorType.GAUGE_INT64),
        ValueType.INT64
      );
      assert.strictEqual(
        TEST_ONLY.createValueType(MetricDescriptorType.CUMULATIVE_DOUBLE),
        ValueType.DOUBLE
      );
      assert.strictEqual(
        TEST_ONLY.createValueType(MetricDescriptorType.CUMULATIVE_DISTRIBUTION),
        ValueType.DISTRIBUTION
      );
      assert.strictEqual(
        TEST_ONLY.createValueType(MetricDescriptorType.GAUGE_DISTRIBUTION),
        ValueType.DISTRIBUTION
      );
      assert.strictEqual(
        TEST_ONLY.createValueType(MetricDescriptorType.SUMMARY),
        ValueType.VALUE_TYPE_UNSPECIFIED
      );
    });
  });

  describe('createLabelDescriptor()', () => {
    const labelKeys: LabelKey[] = [{ key: 'key', description: 'desc' }];

    it('should return a Stackdriver LabelDescriptor', () => {
      assert.deepStrictEqual(TEST_ONLY.createLabelDescriptor(labelKeys), [
        { description: 'desc', key: 'key', valueType: 'STRING' },
        {
          description: 'Opencensus task identifier',
          key: 'opencensus_task',
          valueType: 'STRING',
        },
      ]);
    });
  });

  describe('createDisplayName()', () => {
    it('should return a Stackdriver DisplayName', () => {
      assert.strictEqual(
        TEST_ONLY.createDisplayName(
          'demo/latency',
          'custom.googleapis.com/opencensus'
        ),
        'custom.googleapis.com/opencensus/demo/latency'
      );
    });
  });

  describe('createMetricType()', () => {
    it('should return a Stackdriver MetricType', () => {
      assert.strictEqual(
        TEST_ONLY.createMetricType('demo/latency', 'opencensus'),
        'opencensus/demo/latency'
      );
    });
  });

  describe('createMetric()', () => {
    const labelKeys: LabelKey[] = [{ key: 'key1', description: 'desc' }];
    const labelValues: LabelValue[] = [{ value: 'value1' }];
    const emptyLabelValues: LabelValue[] = [{ value: '' }];
    const metricDescriptor: OCMetricDescriptor = {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      unit: DEFAULT_UNIT,
      type: MetricDescriptorType.GAUGE_INT64,
      labelKeys,
    };

    it('should return a Stackdriver Metric', () => {
      const metric = TEST_ONLY.createMetric(
        metricDescriptor,
        labelValues,
        StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN
      );
      assert.strictEqual(
        metric.type,
        `custom.googleapis.com/opencensus/${METRIC_NAME}`
      );
      assert.deepStrictEqual(metric.labels, {
        key1: 'value1',
        opencensus_task: OPENCENSUS_TASK_VALUE_DEFAULT,
      });
    });

    it('should return a Stackdriver Metric With External Metric Domain', () => {
      const prometheusDomain = 'external.googleapis.com/prometheus/';
      const metric = TEST_ONLY.createMetric(
        metricDescriptor,
        labelValues,
        prometheusDomain
      );
      assert.strictEqual(metric.type, `${prometheusDomain}${METRIC_NAME}`);
      assert.deepStrictEqual(metric.labels, {
        key1: 'value1',
        opencensus_task: OPENCENSUS_TASK_VALUE_DEFAULT,
      });
    });

    it('should return a Stackdriver Metric With Empty Label', () => {
      const prometheusDomain = 'external.googleapis.com/prometheus/';
      const metric = TEST_ONLY.createMetric(
        metricDescriptor,
        [],
        prometheusDomain
      );
      assert.strictEqual(metric.type, `${prometheusDomain}${METRIC_NAME}`);
      assert.deepStrictEqual(metric.labels, {
        opencensus_task: OPENCENSUS_TASK_VALUE_DEFAULT,
      });
    });

    it('should return a Stackdriver Metric With Empty label value', () => {
      const metric = TEST_ONLY.createMetric(
        metricDescriptor,
        emptyLabelValues,
        StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN
      );
      assert.strictEqual(
        metric.type,
        `custom.googleapis.com/opencensus/${METRIC_NAME}`
      );
      assert.deepStrictEqual(metric.labels, {
        key1: '',
        opencensus_task: OPENCENSUS_TASK_VALUE_DEFAULT,
      });
    });
  });

  describe('createDistribution()', () => {
    const attachments = { k1: 'v1' };
    const spanContext = {
      traceId: '3ad17e665f514aabb896341f670179ed',
      spanId: '3aaeb440a89d9e82',
      options: 0x1,
    };
    const distributionValue: DistributionValue = {
      count: 3,
      sum: 2,
      sumOfSquaredDeviation: 14,
      bucketOptions: { explicit: { bounds: [1.0, 3.0, 5.0] } },
      buckets: [
        {
          count: 3,
          exemplar: {
            value: 5,
            timestamp: { seconds: 1450000000, nanos: 0 },
            attachments,
          },
        },
        { count: 1 },
        { count: 2 },
        {
          count: 4,
          exemplar: {
            value: 5,
            timestamp: { seconds: 1450000000, nanos: 0 },
            attachments: { SpanContext: `'${spanContext}'` },
          },
        },
      ],
    };
    it('should return a Stackdriver Distribution', () => {
      const distribution: Distribution = TEST_ONLY.createDistribution(
        distributionValue
      );

      assert.strictEqual(distribution.count, 3);
      assert.strictEqual(distribution.mean, 0.6666666666666666);
      assert.strictEqual(distribution.sumOfSquaredDeviation, 14);
      assert.deepStrictEqual(distribution.bucketOptions, {
        explicitBuckets: { bounds: [0, 1, 3, 5] },
      });
      assert.deepStrictEqual(distribution.bucketCounts, [0, 3, 1, 2, 4]);
      assert.deepStrictEqual(distribution.exemplars, [
        {
          attachments: [
            {
              '@type': 'type.googleapis.com/google.protobuf.StringValue',
              value: 'v1',
            },
          ],
          timestamp: '2015-12-13T09:46:40.Z',
          value: 5,
        },
      ]);
    });
  });

  describe('createMetricDescriptorData()', () => {
    const labelKeys: LabelKey[] = [{ key: 'key1', description: 'desc' }];
    const metricDescriptor: OCMetricDescriptor = {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      unit: DEFAULT_UNIT,
      type: MetricDescriptorType.GAUGE_INT64,
      labelKeys,
    };
    const metricDescriptor1: OCMetricDescriptor = {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      unit: DEFAULT_UNIT,
      type: MetricDescriptorType.CUMULATIVE_INT64,
      labelKeys,
    };

    it('should return a Stackdriver MetricDescriptor', () => {
      const descriptor: MetricDescriptor = createMetricDescriptorData(
        metricDescriptor,
        'custom.googleapis.com/myorg/',
        'myorg/'
      );

      assert.strictEqual(descriptor.description, METRIC_DESCRIPTION);
      assert.strictEqual(descriptor.displayName, `myorg/${METRIC_NAME}`);
      assert.strictEqual(
        descriptor.type,
        `custom.googleapis.com/myorg/${METRIC_NAME}`
      );
      assert.strictEqual(descriptor.unit, DEFAULT_UNIT);
      assert.strictEqual(descriptor.metricKind, MetricKind.GAUGE);
      assert.strictEqual(descriptor.valueType, ValueType.INT64);
      assert.deepStrictEqual(descriptor.labels, [
        { description: 'desc', key: 'key1', valueType: 'STRING' },
        {
          description: 'Opencensus task identifier',
          key: 'opencensus_task',
          valueType: 'STRING',
        },
      ]);
    });

    it('should return a Cumulative Stackdriver MetricDescriptor', () => {
      const descriptor: MetricDescriptor = createMetricDescriptorData(
        metricDescriptor1,
        StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN,
        'OpenCensus'
      );

      assert.strictEqual(descriptor.description, METRIC_DESCRIPTION);
      assert.strictEqual(descriptor.displayName, `OpenCensus/${METRIC_NAME}`);
      assert.strictEqual(
        descriptor.type,
        `${StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN}/${METRIC_NAME}`
      );
      assert.strictEqual(descriptor.unit, DEFAULT_UNIT);
      assert.strictEqual(descriptor.metricKind, MetricKind.CUMULATIVE);
      assert.strictEqual(descriptor.valueType, ValueType.INT64);
      assert.deepStrictEqual(descriptor.labels, [
        { description: 'desc', key: 'key1', valueType: 'STRING' },
        {
          description: 'Opencensus task identifier',
          key: 'opencensus_task',
          valueType: 'STRING',
        },
      ]);
    });
  });

  describe('createPoint()', () => {
    const startTimestamp: Timestamp = { seconds: 1546998712, nanos: 20 };
    const pointTimestamp = { seconds: 1546998775, nanos: 10 };
    const intPoint: TimeSeriesPoint = {
      value: 12345678,
      timestamp: pointTimestamp,
    };
    const doublePoint: TimeSeriesPoint = {
      value: 12345678.2,
      timestamp: pointTimestamp,
    };
    const distributionPoint: TimeSeriesPoint = {
      value: {
        count: 3,
        sum: 2,
        sumOfSquaredDeviation: 14,
        bucketOptions: { explicit: { bounds: [1.2, 3.2, 5.2] } },
        buckets: [{ count: 3 }, { count: 1 }, { count: 2 }, { count: 4 }],
      },
      timestamp: pointTimestamp,
    };

    it('should return a Stackdriver Point', () => {
      const pt = TEST_ONLY.createPoint(doublePoint, ValueType.DOUBLE);

      assert.deepStrictEqual(pt, {
        value: { doubleValue: 12345678.2 },
        interval: { endTime: '2019-01-09T01:52:55.00000001Z' },
      });
    });

    it('should return a Stackdriver Cumulative Point', () => {
      const pt = TEST_ONLY.createPoint(
        intPoint,
        ValueType.INT64,
        startTimestamp
      );

      assert.deepStrictEqual(pt, {
        value: { int64Value: 12345678 },
        interval: {
          startTime: '2019-01-09T01:51:52.00000002Z',
          endTime: '2019-01-09T01:52:55.00000001Z',
        },
      });
    });

    it('should return a Stackdriver Distribution Point', () => {
      const pt = TEST_ONLY.createPoint(
        distributionPoint,
        ValueType.DISTRIBUTION,
        startTimestamp
      );

      assert.deepStrictEqual(pt, {
        value: {
          distributionValue: {
            count: 3,
            mean: 0.6666666666666666,
            sumOfSquaredDeviation: 14,
            bucketOptions: { explicitBuckets: { bounds: [0, 1.2, 3.2, 5.2] } },
            bucketCounts: [0, 3, 1, 2, 4],
            exemplars: [],
          },
        },
        interval: {
          startTime: '2019-01-09T01:51:52.00000002Z',
          endTime: '2019-01-09T01:52:55.00000001Z',
        },
      });
    });
  });

  describe('createTimeSeriesList()', () => {
    const metricPrefix = StackdriverStatsExporter.CUSTOM_OPENCENSUS_DOMAIN;
    const defaultResource = { type: 'global', labels: {} };
    const customResource = {
      type: 'global',
      labels: { name: 'p0001', zone: 'us-west-1' },
    };
    const labelKeys = [{ key: 'key1', description: 'desc' }];
    const labelValues = [{ value: 'value1' }];
    const labelValues2 = [{ value: 'value2' }];
    const cumulativeMetricDescriptor = {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      unit: DEFAULT_UNIT,
      type: MetricDescriptorType.CUMULATIVE_DOUBLE,
      labelKeys,
    };
    const pointTimestamp = { seconds: 100, nanos: 1e7 };
    const doublePoint = { value: 12345678.2, timestamp: pointTimestamp };
    const startTimestamp: Timestamp = { seconds: 90, nanos: 1e7 };
    const cumulativeTimeSeries = {
      labelValues,
      points: [doublePoint],
      startTimestamp,
    };
    const metric = {
      descriptor: cumulativeMetricDescriptor,
      timeseries: [cumulativeTimeSeries],
    };

    const gaugeMetricDescriptor = {
      name: METRIC_NAME,
      description: METRIC_DESCRIPTION,
      unit: DEFAULT_UNIT,
      type: MetricDescriptorType.GAUGE_DOUBLE,
      labelKeys,
    };
    const gaugePoint1 = { value: 10, timestamp: pointTimestamp };
    const gaugePoint2 = { value: 15, timestamp: pointTimestamp };
    const gaugeTimeSeries1 = { labelValues, points: [gaugePoint1] };
    const gaugeTimeSeries2 = {
      labelValues: labelValues2,
      points: [gaugePoint2],
    };
    const gaugeMetric = {
      descriptor: gaugeMetricDescriptor,
      timeseries: [gaugeTimeSeries1, gaugeTimeSeries2],
    };

    it('should return a Stackdriver TimeSeries', () => {
      const timeSeriesList = createTimeSeriesList(
        metric,
        defaultResource,
        metricPrefix
      );

      assert.strictEqual(timeSeriesList.length, 1);
      const [timeseries] = timeSeriesList;
      assert.deepStrictEqual(
        timeseries.metric.type,
        'custom.googleapis.com/opencensus/metric-name'
      );
      assert.deepStrictEqual(timeseries.metric.labels, {
        key1: 'value1',
        opencensus_task: OPENCENSUS_TASK_VALUE_DEFAULT,
      });
      assert.deepStrictEqual(timeseries.metricKind, MetricKind.CUMULATIVE);
      assert.deepStrictEqual(timeseries.valueType, ValueType.DOUBLE);
      assert.deepStrictEqual(timeseries.resource, {
        type: 'global',
        labels: {},
      });
      assert.deepStrictEqual(timeseries.points.length, 1);
      const [point] = timeseries.points;
      assert.deepStrictEqual(point.value, { doubleValue: 12345678.2 });
    });

    it('should return a Stackdriver TimeSeries with custom monitored resource', () => {
      const timeSeriesList = createTimeSeriesList(
        metric,
        customResource,
        metricPrefix
      );

      assert.strictEqual(timeSeriesList.length, 1);
      const [timeseries] = timeSeriesList;
      assert.deepStrictEqual(
        timeseries.metric.type,
        'custom.googleapis.com/opencensus/metric-name'
      );
      assert.deepStrictEqual(timeseries.metric.labels, {
        key1: 'value1',
        opencensus_task: OPENCENSUS_TASK_VALUE_DEFAULT,
      });
      assert.deepStrictEqual(timeseries.resource, {
        type: 'global',
        labels: { name: 'p0001', zone: 'us-west-1' },
      });
      assert.deepStrictEqual(timeseries.points.length, 1);
      const [point] = timeseries.points;
      assert.deepStrictEqual(point.value, { doubleValue: 12345678.2 });
    });

    it('should return a Stackdriver TimeSeries with Gauge and multiple timeseries', () => {
      const timeSeriesList = createTimeSeriesList(
        gaugeMetric,
        defaultResource,
        metricPrefix
      );

      assert.strictEqual(timeSeriesList.length, 2);
      const [timeseries1, timeseries2] = timeSeriesList;
      assert.deepStrictEqual(
        timeseries1.metric.type,
        'custom.googleapis.com/opencensus/metric-name'
      );
      assert.deepStrictEqual(timeseries1.metric.labels, {
        key1: 'value1',
        opencensus_task: OPENCENSUS_TASK_VALUE_DEFAULT,
      });
      assert.deepStrictEqual(timeseries1.metricKind, MetricKind.GAUGE);
      assert.deepStrictEqual(timeseries1.valueType, ValueType.DOUBLE);
      assert.deepStrictEqual(timeseries1.resource, {
        type: 'global',
        labels: {},
      });
      assert.deepStrictEqual(timeseries1.points.length, 1);
      const [point1] = timeseries1.points;
      assert.deepStrictEqual(point1.value, { doubleValue: 10 });
      const [point2] = timeseries2.points;
      assert.deepStrictEqual(point2.value, { doubleValue: 15 });
    });
  });

  describe('getDefaultResource()', () => {
    beforeEach(() => {
      delete process.env.OC_RESOURCE_TYPE;
      delete process.env.OC_RESOURCE_LABELS;
      CoreResource.setup();
    });

    it('should return a global MonitoredResource', async () => {
      nocks.noDetectResource();
      const monitoredResource = await getDefaultResource('my-project-id');
      const { type, labels } = monitoredResource;

      assert.strictEqual(type, 'global');
      assert.deepStrictEqual(labels, { project_id: 'my-project-id' });
    });

    it('should return a k8s MonitoredResource', async () => {
      process.env.OC_RESOURCE_TYPE = 'k8s.io/container';
      process.env.OC_RESOURCE_LABELS =
        'k8s.pod.name=pod-xyz-123,' +
        'container.name=c1,k8s.namespace.name=default,' +
        'cloud.zone=zone1,k8s.cluster.name=cluster1';
      CoreResource.setup();
      const monitoredResource = await getDefaultResource('my-project-id');
      const { type, labels } = monitoredResource;

      assert.strictEqual(type, 'k8s_container');
      assert.strictEqual(Object.keys(labels).length, 6);
      assert.deepStrictEqual(labels, {
        cluster_name: 'cluster1',
        container_name: 'c1',
        namespace_name: 'default',
        pod_name: 'pod-xyz-123',
        project_id: 'my-project-id',
        location: 'zone1',
      });
    });

    it('should return a gce MonitoredResource', async () => {
      process.env.OC_RESOURCE_TYPE = 'cloud.google.com/gce/instance';
      process.env.OC_RESOURCE_LABELS = 'host.id=id1,cloud.zone=zone1';
      CoreResource.setup();
      const monitoredResource = await getDefaultResource('my-project-id');
      const { type, labels } = monitoredResource;

      assert.strictEqual(type, 'gce_instance');
      assert.strictEqual(Object.keys(labels).length, 3);
      assert.deepStrictEqual(labels, {
        instance_id: 'id1',
        project_id: 'my-project-id',
        zone: 'zone1',
      });
    });

    it('should fallback to global type is any of the label is missing', async () => {
      process.env.OC_RESOURCE_TYPE = 'cloud.google.com/gce/instance';
      process.env.OC_RESOURCE_LABELS = 'cloud.zone=zone1';
      CoreResource.setup();
      const monitoredResource = await getDefaultResource('my-project-id');
      const { type, labels } = monitoredResource;

      assert.strictEqual(type, 'global');
      assert.strictEqual(Object.keys(labels).length, 1);
      assert.deepStrictEqual(labels, { project_id: 'my-project-id' });
    });

    it('should return a aws MonitoredResource', async () => {
      process.env.OC_RESOURCE_TYPE = 'aws.com/ec2/instance';
      process.env.OC_RESOURCE_LABELS =
        'cloud.account.id=id1,' + 'host.id=instance1,cloud.region=region1';
      CoreResource.setup();
      const monitoredResource = await getDefaultResource('my-project-id');
      const { type, labels } = monitoredResource;

      assert.strictEqual(type, 'aws_ec2_instance');
      assert.strictEqual(Object.keys(labels).length, 4);
      assert.deepStrictEqual(labels, {
        instance_id: 'instance1',
        region: 'aws:region1',
        project_id: 'my-project-id',
        aws_account: 'id1',
      });
    });
  });
});
