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

import {Resource} from '../src/resource/resource';

const DEFAULT_RESOURCE = new Resource(null, {});
const DEFAULT_RESOURCE_1 = new Resource('default', {'a': '100'});
const RESOURCE_1 = new Resource('t1', {'a': '1', 'b': '2'});
const RESOURCE_2 = new Resource('t2', {'a': '1', 'b': '3', 'c': '4'});

describe('Resource()', () => {
  afterEach(() => {
    delete process.env.OC_RESOURCE_TYPE;
    delete process.env.OC_RESOURCE_LABELS;
  });

  it('should return resource information from environment variables', () => {
    const resource = Resource.createFromEnvironmentVariables();
    const actualLabels = resource.getLabels();
    const expectedLabels: {[key: string]: string} = {
      'k8s.io/container/name': '"c1"',
      'k8s.io/namespace/name': '"default"',
      'k8s.io/pod/name': '"pod-xyz-123"'
    };

    assert.strictEqual(resource.getType(), 'k8s.io/container');
    assert.equal(Object.keys(actualLabels).length, 3);
    assert.deepEqual(actualLabels, expectedLabels);
  });
});

describe('mergeResources()', () => {
  it('merge resources with default, resource1', () => {
    const resources: Resource[] = [DEFAULT_RESOURCE, RESOURCE_1];
    const resource = Resource.mergeResources(resources);
    const expectedLabels: {[key: string]: string} = {'a': '1', 'b': '2'};

    assert.equal(resource.getType(), 't1');
    assert.equal(Object.keys(resource.getLabels()).length, 2);
    assert.deepEqual(resource.getLabels(), expectedLabels);
  });

  it('merge resources with default, resource1, resource2 = null', () => {
    const resources: Resource[] = [DEFAULT_RESOURCE, RESOURCE_1, null];
    const resource = Resource.mergeResources(resources);
    const expectedLabels: {[key: string]: string} = {'a': '1', 'b': '2'};

    assert.equal(resource.getType(), 't1');
    assert.equal(Object.keys(resource.getLabels()).length, 2);
    assert.deepEqual(resource.getLabels(), expectedLabels);
  });

  it('merge resources with default, resource1 = null, resource2', () => {
    const resources: Resource[] = [DEFAULT_RESOURCE, null, RESOURCE_2];
    const resource = Resource.mergeResources(resources);
    const expectedLabels:
        {[key: string]: string} = {'a': '1', 'b': '3', 'c': '4'};

    assert.equal(resource.getType(), 't2');
    assert.equal(Object.keys(resource.getLabels()).length, 3);
    assert.deepEqual(resource.getLabels(), expectedLabels);
  });

  it('merge resources with default1, resource1, resource2', () => {
    const resources: Resource[] = [DEFAULT_RESOURCE_1, RESOURCE_1, RESOURCE_2];
    const resource = Resource.mergeResources(resources);
    const expectedLabels:
        {[key: string]: string} = {'a': '100', 'b': '2', 'c': '4'};

    assert.equal(resource.getType(), 'default');
    assert.equal(Object.keys(resource.getLabels()).length, 3);
    assert.deepEqual(resource.getLabels(), expectedLabels);
  });

  it('merge resources with default, resource1 = undefined, resource2 = undefined',
     () => {
       const resources: Resource[] = [DEFAULT_RESOURCE_1, undefined, undefined];
       const resource = Resource.mergeResources(resources);
       const expectedLabels: {[key: string]: string} = {'a': '100'};

       assert.equal(resource.getType(), 'default');
       assert.equal(Object.keys(resource.getLabels()).length, 1);
       assert.deepEqual(resource.getLabels(), expectedLabels);
     });
});
