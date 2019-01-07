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

import * as assert from 'assert';
import {metricProducerManagerInstance} from '../src/metrics/export/metric-producer-manager';
import {MetricRegistry} from '../src/metrics/metric-registry';

describe('MetricProducerManager()', () => {
  const registry: MetricRegistry = new MetricRegistry();
  const metricProducer = registry.getMetricProducer();
  const registryOther: MetricRegistry = new MetricRegistry();
  const metricProducerOther = registryOther.getMetricProducer();

  beforeEach(() => {
    metricProducerManagerInstance.removeAll();
  });

  describe('add()', () => {
    it('should throw an error when the metricproducer is null', () => {
      assert.throws(() => {
        metricProducerManagerInstance.add(null);
      }, /^Error: Missing mandatory metricProducer parameter$/);
    });

    it('add metricproducer', () => {
      metricProducerManagerInstance.add(metricProducer);
      const metricProducerList =
          metricProducerManagerInstance.getAllMetricProducer();

      assert.notDeepEqual(metricProducerList, null);
      assert.equal(metricProducerList.size, 1);
    });

    it('should not add same metricproducer metricProducerManagerInstance',
       () => {
         metricProducerManagerInstance.add(metricProducer);
         metricProducerManagerInstance.add(metricProducer);
         metricProducerManagerInstance.add(metricProducer);
         const metricProducerList =
             metricProducerManagerInstance.getAllMetricProducer();

         assert.equal(metricProducerList.size, 1);
         assert.ok(metricProducerList.has(metricProducer));
       });

    it('should add different metricproducer metricProducerManagerInstance',
       () => {
         metricProducerManagerInstance.add(metricProducer);
         metricProducerManagerInstance.add(metricProducerOther);
         const metricProducerList =
             metricProducerManagerInstance.getAllMetricProducer();

         assert.equal(metricProducerList.size, 2);
         assert.ok(metricProducerList.has(metricProducer));
         assert.ok(metricProducerList.has(metricProducerOther));
       });
  });

  describe('remove()', () => {
    it('should throw an error when the metricproducer is null', () => {
      assert.throws(() => {
        metricProducerManagerInstance.add(null);
      }, /^Error: Missing mandatory metricProducer parameter$/);
    });

    it('remove metricproducer', () => {
      metricProducerManagerInstance.add(metricProducer);

      const metricProducerList =
          metricProducerManagerInstance.getAllMetricProducer();
      assert.equal(metricProducerList.size, 1);
      assert.ok(metricProducerList.has(metricProducer));

      metricProducerManagerInstance.remove(metricProducer);
      assert.equal(metricProducerList.size, 0);
    });
  });
});
