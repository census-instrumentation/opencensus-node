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
import * as coreTypes from '@opencensus/core';
import * as assert from 'assert';
import {
  createAttributes,
  createLinks,
  createTimeEvents,
  getResourceLabels,
} from '../src/stackdriver-cloudtrace-utils';

describe('Stackdriver CloudTrace Exporter Utils', () => {
  describe('createLinks()', () => {
    const links: coreTypes.Link[] = [
      {
        traceId: 'traceId1',
        spanId: 'spanId1',
        type: coreTypes.LinkType.PARENT_LINKED_SPAN,
        attributes: {
          child_link_attribute_string: 'foo1',
          child_link_attribute_number: 123,
          child_link_attribute_boolean: true,
        },
      },
      {
        traceId: 'traceId2',
        spanId: 'spanId2',
        type: coreTypes.LinkType.CHILD_LINKED_SPAN,
        attributes: {},
      },
      {
        traceId: 'traceId3',
        spanId: 'spanId3',
        type: coreTypes.LinkType.UNSPECIFIED,
        attributes: {},
      },
    ];

    const expectedLink = [
      {
        type: 2,
        traceId: 'traceId1',
        spanId: 'spanId1',
        attributes: {
          droppedAttributesCount: 0,
          attributeMap: {
            child_link_attribute_string: { stringValue: { value: 'foo1' } },
            child_link_attribute_number: { intValue: '123' },
            child_link_attribute_boolean: { boolValue: true },
          },
        },
      },
      {
        type: 1,
        traceId: 'traceId2',
        spanId: 'spanId2',
        attributes: { attributeMap: {}, droppedAttributesCount: 0 },
      },
      {
        type: 0,
        traceId: 'traceId3',
        spanId: 'spanId3',
        attributes: { attributeMap: {}, droppedAttributesCount: 0 },
      },
    ];

    it('should return stackdriver links', () => {
      const stackdriverLinks = createLinks(links, 2);

      assert.strictEqual(stackdriverLinks.droppedLinksCount, 2);
      assert.strictEqual(stackdriverLinks.link!.length, 3);
      assert.deepStrictEqual(stackdriverLinks.link, expectedLink);
    });
  });

  describe('createTimeEvents()', () => {
    const ts = 123456789;
    const annotations: coreTypes.Annotation[] = [
      {
        description: 'my_annotation',
        timestamp: ts,
        attributes: { myString: 'bar', myNumber: 123, myBoolean: true },
      },
      {
        description: 'my_annotation1',
        timestamp: ts,
        attributes: { myString: 'bar1', myNumber: 456 },
      },
      { description: 'my_annotation2', timestamp: ts, attributes: {} },
    ];
    const messageEvents: coreTypes.MessageEvent[] = [
      {
        id: 1,
        timestamp: ts,
        type: coreTypes.MessageEventType.SENT,
        compressedSize: 100,
        uncompressedSize: 12,
      },
      { id: 1, timestamp: ts, type: coreTypes.MessageEventType.RECEIVED },
      { id: 1, timestamp: ts, type: coreTypes.MessageEventType.UNSPECIFIED },
    ];

    const expectedTimeEvent = [
      {
        time: '1970-01-02T10:17:36.789Z',
        annotation: {
          description: { value: 'my_annotation' },
          attributes: {
            attributeMap: {
              myString: { stringValue: { value: 'bar' } },
              myNumber: { intValue: '123' },
              myBoolean: { boolValue: true },
            },
            droppedAttributesCount: 0,
          },
        },
      },
      {
        time: '1970-01-02T10:17:36.789Z',
        annotation: {
          description: { value: 'my_annotation1' },
          attributes: {
            attributeMap: {
              myString: { stringValue: { value: 'bar1' } },
              myNumber: { intValue: '456' },
            },
            droppedAttributesCount: 0,
          },
        },
      },
      {
        time: '1970-01-02T10:17:36.789Z',
        annotation: {
          description: { value: 'my_annotation2' },
          attributes: { attributeMap: {}, droppedAttributesCount: 0 },
        },
      },
      {
        messageEvent: {
          compressedSizeBytes: '100',
          id: '1',
          type: 1,
          uncompressedSizeBytes: '12',
        },
        time: '1970-01-02T10:17:36.789Z',
      },
      {
        messageEvent: {
          compressedSizeBytes: '0',
          id: '1',
          type: 2,
          uncompressedSizeBytes: '0',
        },
        time: '1970-01-02T10:17:36.789Z',
      },
      {
        messageEvent: {
          compressedSizeBytes: '0',
          id: '1',
          type: 0,
          uncompressedSizeBytes: '0',
        },
        time: '1970-01-02T10:17:36.789Z',
      },
    ];

    it('should return stackdriver TimeEvents', () => {
      const stackdriverTimeEvents = createTimeEvents(
        annotations,
        messageEvents,
        2,
        3
      );

      assert.strictEqual(stackdriverTimeEvents.droppedAnnotationsCount, 2);
      assert.strictEqual(stackdriverTimeEvents.droppedMessageEventsCount, 3);
      assert.strictEqual(stackdriverTimeEvents.timeEvent!.length, 6);
      assert.deepStrictEqual(
        stackdriverTimeEvents.timeEvent,
        expectedTimeEvent
      );
    });

    it('should return stackdriver TimeEvents when empty annotations and messageEvents', () => {
      const stackdriverTimeEvents = createTimeEvents([], [], 0, 0);

      assert.strictEqual(stackdriverTimeEvents.droppedAnnotationsCount, 0);
      assert.strictEqual(stackdriverTimeEvents.droppedMessageEventsCount, 0);
      assert.strictEqual(stackdriverTimeEvents.timeEvent!.length, 0);
    });
  });

  describe('createAttributes()', () => {
    const attributes = { 'my-attribute': 100, 'my-attribute1': 'test' };
    let expectedAttributeMap = {
      'g.co/agent': {
        stringValue: { value: `opencensus-node [${coreTypes.version}]` },
      },
      'my-attribute': { intValue: '100' },
      'my-attribute1': { stringValue: { value: 'test' } },
    };

    it('should return stackdriver Attributes', () => {
      const stackdriverAttribute = createAttributes(attributes, {}, 0);
      assert.strictEqual(stackdriverAttribute.droppedAttributesCount, 0);
      assert.strictEqual(
        Object.keys(stackdriverAttribute.attributeMap!).length,
        3
      );
      assert.deepStrictEqual(
        stackdriverAttribute.attributeMap,
        expectedAttributeMap
      );
    });

    it('should return stackdriver Attributes with labels', () => {
      const stackdriverAttribute = createAttributes(
        attributes,
        {
          'g.co/r/podId': { intValue: '100' },
          'g.co/r/project_id': { stringValue: { value: 'project1' } },
        },
        2
      );
      expectedAttributeMap = Object.assign({}, expectedAttributeMap, {
        'g.co/r/podId': { intValue: '100' },
        'g.co/r/project_id': { stringValue: { value: 'project1' } },
      });
      assert.strictEqual(stackdriverAttribute.droppedAttributesCount, 2);
      assert.strictEqual(
        Object.keys(stackdriverAttribute.attributeMap!).length,
        5
      );
      assert.deepStrictEqual(
        stackdriverAttribute.attributeMap,
        expectedAttributeMap
      );
    });

    it('should map http attributes to the stackdriver format', () => {
      const attributes = {
        'http.host': 'localhost',
        'http.method': 'GET',
        'http.path': '/status',
        'http.route': 'route',
        'http.user_agent': 'agent',
        'http.status_code': 200,
        'http.url': 'http://localhost',
      };

      const expectedMap = {
        'g.co/agent': {
          stringValue: { value: `opencensus-node [${coreTypes.version}]` },
        },
        '/http/host': { stringValue: { value: 'localhost' } },
        '/http/method': { stringValue: { value: 'GET' } },
        '/http/path': { stringValue: { value: '/status' } },
        '/http/route': { stringValue: { value: 'route' } },
        '/http/user_agent': { stringValue: { value: 'agent' } },
        '/http/status_code': { intValue: '200' },
        '/http/url': { stringValue: { value: 'http://localhost' } },
      };

      const stackdriverAttribute = createAttributes(attributes, {}, 0);
      assert.strictEqual(stackdriverAttribute.droppedAttributesCount, 0);
      assert.strictEqual(
        Object.keys(stackdriverAttribute.attributeMap!).length,
        8
      );
      assert.deepStrictEqual(stackdriverAttribute.attributeMap, expectedMap);
    });
  });

  describe('getResourceLabels()', () => {
    it('should return K8s container labels', async () => {
      const resource = {
        type: 'k8s_container',
        labels: {
          container_name: 'c1',
          namespace_name: 'default',
          pod_name: 'pod-xyz-123',
          project_id: 'my-project-id',
          location: 'zone1',
        },
      };
      const expectedLabels = {
        'g.co/r/k8s_container/container_name': { stringValue: { value: 'c1' } },
        'g.co/r/k8s_container/location': { stringValue: { value: 'zone1' } },
        'g.co/r/k8s_container/namespace_name': {
          stringValue: { value: 'default' },
        },
        'g.co/r/k8s_container/pod_name': {
          stringValue: { value: 'pod-xyz-123' },
        },
        'g.co/r/k8s_container/project_id': {
          stringValue: { value: 'my-project-id' },
        },
      };

      const resolvingPromise = Promise.resolve(resource);
      const resourceLabels = await getResourceLabels(resolvingPromise);
      assert.strictEqual(Object.keys(resourceLabels).length, 5);
      assert.deepStrictEqual(resourceLabels, expectedLabels);
    });

    it('should return gce instance labels', async () => {
      const resource = {
        type: 'gce_instance',
        labels: {
          instance_id: 'instance1',
          zone: 'zone1',
          project_id: 'my-project-id',
        },
      };
      const expectedLabels = {
        'g.co/r/gce_instance/instance_id': {
          stringValue: { value: 'instance1' },
        },
        'g.co/r/gce_instance/project_id': {
          stringValue: { value: 'my-project-id' },
        },
        'g.co/r/gce_instance/zone': { stringValue: { value: 'zone1' } },
      };
      const resolvingPromise = Promise.resolve(resource);
      const resourceLabels = await getResourceLabels(resolvingPromise);
      assert.strictEqual(Object.keys(resourceLabels).length, 3);
      assert.deepStrictEqual(resourceLabels, expectedLabels);
    });

    it('should return aws ec2 instance labels', async () => {
      const resource = {
        type: 'aws_ec2_instance',
        labels: {
          instance_id: 'instance1',
          region: 'region1',
          project_id: 'my-project-id',
          aws_account: 'my-account-id',
        },
      };
      const expectedLabels = {
        'g.co/r/aws_ec2_instance/aws_account': {
          stringValue: { value: 'my-account-id' },
        },
        'g.co/r/aws_ec2_instance/instance_id': {
          stringValue: { value: 'instance1' },
        },
        'g.co/r/aws_ec2_instance/project_id': {
          stringValue: { value: 'my-project-id' },
        },
        'g.co/r/aws_ec2_instance/region': { stringValue: { value: 'region1' } },
      };

      const resolvingPromise = Promise.resolve(resource);
      const resourceLabels = await getResourceLabels(resolvingPromise);
      assert.strictEqual(Object.keys(resourceLabels).length, 4);
      assert.deepStrictEqual(resourceLabels, expectedLabels);
    });
  });
});
