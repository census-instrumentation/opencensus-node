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

import {TraceParams} from '../src/trace/config/types';
import {RootSpan} from '../src/trace/model/root-span';
import {CoreTracer} from '../src/trace/model/tracer';
<<<<<<< HEAD
import {SamplerBuilder, TraceParamasBuilder} from '../src/trace/sampler/sampler';
=======
import {SamplerBuilder, TraceParamsBuilder} from '../src/trace/sampler/sampler';
>>>>>>> 82b26d253e576ece9bc559be0689c1480eaf9ce2

const tracer = new CoreTracer();

const traceParameters: TraceParams = {
  numberOfAnnontationEventsPerSpan: 12,
  numberOfAttributesPerSpan: 10,
  numberOfLinksPerSpan: 7,
  numberOfMessageEventsPerSpan: 5
};

describe('Sampler', () => {
  /**
   * Should return true
   */
  describe('shouldSample() always', () => {
    it('should return a always sampler for 1', () => {
      const root = new RootSpan(tracer);
      const sampler = SamplerBuilder.getSampler(1);
      const samplerShouldSample = sampler.shouldSample(root.traceId);
      assert.strictEqual(sampler.description, 'always');
      assert.ok(samplerShouldSample);
    });
    it('should return a always sampler for >1', () => {
      const root = new RootSpan(tracer);
      const sampler = SamplerBuilder.getSampler(100);
      const samplerShouldSample = sampler.shouldSample(root.traceId);
      assert.strictEqual(sampler.description, 'always');
      assert.ok(samplerShouldSample);
    });
  });
  /**
   * Should return false
   */
  describe('shouldSample() never', () => {
    it('should return a never sampler for 0', () => {
      const root = new RootSpan(tracer);
      const sampler = SamplerBuilder.getSampler(0);
      const samplerShouldSample = sampler.shouldSample(root.traceId);
      assert.strictEqual(sampler.description, 'never');
      assert.ok(!samplerShouldSample);
    });
    it('should return a never sampler for negative value', () => {
      const root = new RootSpan(tracer);
      const sampler = SamplerBuilder.getSampler(-1);
      const samplerShouldSample = sampler.shouldSample(root.traceId);
      assert.strictEqual(sampler.description, 'never');
      assert.ok(!samplerShouldSample);
    });
  });

  describe('shouldSample() probability', () => {
    it('should return a probability sampler', () => {
      const sampler = SamplerBuilder.getSampler(0.7);
      assert.ok(sampler.description.indexOf('probability') >= 0);
    });
    it('should sample an empty traceId', () => {
      const sampler = SamplerBuilder.getSampler(0.5);
      const samplerShouldSample = sampler.shouldSample(null);
      assert.ok(samplerShouldSample);
    });
    it('should accept and reject traces based on last 26 bytes of traceId',
       () => {
         const sampler = SamplerBuilder.getSampler(0.5);

         const shouldSample = [
           '11111111111111111110000000000000',
           '1111111111111111111000ffffffffff',
           '11111111111111111117ffffffffffff',
         ];
         shouldSample.forEach(traceId => {
           const samplerShouldSample = sampler.shouldSample(traceId);
           assert.ok(
               samplerShouldSample,
               `should have sampled but didn't: ${traceId}`);
         });

         const shouldNotSample = [
           '11111111111111111118000000000000',
           '11111111111111111118000fffffffff',
           '1111111111111111111fffffffffffff',
         ];
         shouldNotSample.forEach(traceId => {
           const samplerShouldSample = sampler.shouldSample(traceId);
           assert.ok(
               !samplerShouldSample,
               `should not have sampled but did: ${traceId}`);
         });
       });
  });
  describe('getNumberOfAnnotationEventsPerSpan', () => {
    it('should return  12', () => {
      assert.equal(
<<<<<<< HEAD
          TraceParamasBuilder.getNumberOfAnnotationEventsPerSpan(
=======
          TraceParamsBuilder.getNumberOfAnnotationEventsPerSpan(
>>>>>>> 82b26d253e576ece9bc559be0689c1480eaf9ce2
              traceParameters),
          12);
    });
  });
  describe('getNumberOfMessageEventsPerSpan', () => {
    it('should return 5', () => {
      assert.equal(
<<<<<<< HEAD
          TraceParamasBuilder.getNumberOfMessageEventsPerSpan(traceParameters),
=======
          TraceParamsBuilder.getNumberOfMessageEventsPerSpan(traceParameters),
>>>>>>> 82b26d253e576ece9bc559be0689c1480eaf9ce2
          5);
    });
  });
  describe('getNumberOfAttributesPerSpan', () => {
    it('should return 10', () => {
      assert.equal(
<<<<<<< HEAD
          TraceParamasBuilder.getNumberOfAttributesPerSpan(traceParameters),
          10);
=======
          TraceParamsBuilder.getNumberOfAttributesPerSpan(traceParameters), 10);
>>>>>>> 82b26d253e576ece9bc559be0689c1480eaf9ce2
    });
  });
  describe('getNumberOfLinksPerSpan', () => {
    it('should return 7', () => {
      assert.equal(
<<<<<<< HEAD
          TraceParamasBuilder.getNumberOfLinksPerSpan(traceParameters), 7);
    });
  });
});
=======
          TraceParamsBuilder.getNumberOfLinksPerSpan(traceParameters), 7);
    });
  });
});
>>>>>>> 82b26d253e576ece9bc559be0689c1480eaf9ce2
