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
import * as mocha from 'mocha';

import {RootSpan} from '../src/trace/model/root-span';
import {CoreTracer} from '../src/trace/model/tracer';
import {SamplerBuilder} from '../src/trace/sampler/sampler';

const tracer = new CoreTracer();

describe('Sampler', () => {
  /**
   * Should return true
   */
  describe('shouldSample() always', () => {
    it('should return a always sampler for 1', () => {
      const root = new RootSpan(tracer);
      const sampler = SamplerBuilder.getSampler(1);
      const samplerShouldSampler = sampler.shouldSample(root.traceId);
      assert.strictEqual(sampler.description, 'always');
      assert.ok(samplerShouldSampler);
    });
    it('should return a always sampler for >1', () => {
      const root = new RootSpan(tracer);
      const sampler = SamplerBuilder.getSampler(100);
      const samplerShouldSampler = sampler.shouldSample(root.traceId);
      assert.strictEqual(sampler.description, 'always');
      assert.ok(samplerShouldSampler);
    });
  });
  /**
   * Should return false
   */
  describe('shouldSample() never', () => {
    it('should return a never sampler for 0', () => {
      const root = new RootSpan(tracer);
      const sampler = SamplerBuilder.getSampler(0);
      const samplerShouldSampler = sampler.shouldSample(root.traceId);
      assert.strictEqual(sampler.description, 'never');
      assert.ok(!samplerShouldSampler);
    });
    it('should return a never sampler for negative value', () => {
      const root = new RootSpan(tracer);
      const sampler = SamplerBuilder.getSampler(-1);
      const samplerShouldSampler = sampler.shouldSample(root.traceId);
      assert.strictEqual(sampler.description, 'never');
      assert.ok(!samplerShouldSampler);
    });
  });

  describe('shouldSample() probability', () => {
    it('should return a probability sampler', () => {
      const root = new RootSpan(tracer);
      const sampler = SamplerBuilder.getSampler(0.7);
      assert.ok(sampler.description.indexOf('probability') >= 0);
      const samplerShouldSampler = sampler.shouldSample(root.traceId);
      assert.ok(samplerShouldSampler ? samplerShouldSampler : true);
    });
  });
});