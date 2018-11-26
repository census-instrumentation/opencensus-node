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

import * as assert from 'assert';

process.env.OC_RESOURCE_TYPE = 'k8s.io/container';
process.env.OC_RESOURCE_LABELS =
    'k8s.io/pod/name="pod-xyz-123",k8s.io/container/name="c1",k8s.io/namespace/name="default"';

import {CoreResource} from '../src/resource/resource';
import {Resource} from '../src/resource/types';

describe('Resource()', () => {
  afterEach(() => {
    delete process.env.OC_RESOURCE_TYPE;
    delete process.env.OC_RESOURCE_LABELS;
  });

  it('should return resource information from environment variables', () => {
    const resource = CoreResource.createFromEnvironmentVariables();
    const actualLabels = resource.labels;
    const expectedLabels: {[key: string]: string} = {
      'k8s.io/container/name': '"c1"',
      'k8s.io/namespace/name': '"default"',
      'k8s.io/pod/name': '"pod-xyz-123"'
    };

    assert.strictEqual(resource.type, 'k8s.io/container');
    assert.equal(Object.keys(actualLabels).length, 3);
    assert.deepEqual(actualLabels, expectedLabels);
  });
});

describe('mergeResources()', () => {
  const DEFAULT_RESOURCE: Resource = {type: null, labels: {}};
  const DEFAULT_RESOURCE_1: Resource = {type: 'default', labels: {'a': '100'}};
  const RESOURCE_1: Resource = {type: 't1', labels: {'a': '1', 'b': '2'}};
  const RESOURCE_2:
      Resource = {type: 't2', labels: {'a': '1', 'b': '3', 'c': '4'}};

  it('merge resources with default, resource1', () => {
    const resources: Resource[] = [DEFAULT_RESOURCE, RESOURCE_1];
    const resource = CoreResource.mergeResources(resources);
    const expectedLabels: {[key: string]: string} = {'a': '1', 'b': '2'};

    assert.equal(resource.type, 't1');
    assert.equal(Object.keys(resource.labels).length, 2);
    assert.deepEqual(resource.labels, expectedLabels);
  });

  it('merge resources with default, resource1, resource2 = null', () => {
    const resources: Resource[] = [DEFAULT_RESOURCE, RESOURCE_1, null];
    const resource = CoreResource.mergeResources(resources);
    const expectedLabels: {[key: string]: string} = {'a': '1', 'b': '2'};

    assert.equal(resource.type, 't1');
    assert.equal(Object.keys(resource.labels).length, 2);
    assert.deepEqual(resource.labels, expectedLabels);
  });

  it('merge resources with default, resource1 = null, resource2', () => {
    const resources: Resource[] = [DEFAULT_RESOURCE, null, RESOURCE_2];
    const resource = CoreResource.mergeResources(resources);
    const expectedLabels:
        {[key: string]: string} = {'a': '1', 'b': '3', 'c': '4'};

    assert.equal(resource.type, 't2');
    assert.equal(Object.keys(resource.labels).length, 3);
    assert.deepEqual(resource.labels, expectedLabels);
  });

  it('merge resources with default1, resource1, resource2', () => {
    const resources: Resource[] = [DEFAULT_RESOURCE_1, RESOURCE_1, RESOURCE_2];
    const resource = CoreResource.mergeResources(resources);
    const expectedLabels:
        {[key: string]: string} = {'a': '100', 'b': '2', 'c': '4'};

    assert.equal(resource.type, 'default');
    assert.equal(Object.keys(resource.labels).length, 3);
    assert.deepEqual(resource.labels, expectedLabels);
  });

  it('merge resources with default, resource1 = undefined, resource2 = undefined',
     () => {
       const resources: Resource[] = [DEFAULT_RESOURCE_1, undefined, undefined];
       const resource = CoreResource.mergeResources(resources);
       const expectedLabels: {[key: string]: string} = {'a': '100'};

       assert.equal(resource.type, 'default');
       assert.equal(Object.keys(resource.labels).length, 1);
       assert.deepEqual(resource.labels, expectedLabels);
     });
});
