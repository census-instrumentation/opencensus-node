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
import {Tracer} from '../src/trace/model/tracer';
import {Sampler} from '../src/trace/sampler/sampler';

const tracer = new Tracer();

describe('Sampler', () => {
  /**
   * Should create a sampler
   */
  describe('new Sampler()', () => {
    it('should create a Sampler instance', () => {
      const sampler = new Sampler();
      assert.ok(sampler instanceof Sampler);
    });
  });

  /**
   * Should create a sampler with traceId
   */
  describe('new Sampler(traceId)', () => {
    it('should create a Sampler instance', () => {
      const root = new RootSpan(tracer);
      const sampler = new Sampler();
      assert.ok(sampler instanceof Sampler);
    });
  });

  /**
   * Should return the SamplerImpl
   */
  describe('always()', () => {
    it('should return a sampler instance', () => {
      const sampler = new Sampler();
      const samplerAlways = sampler.always();
      assert.ok(samplerAlways instanceof Sampler);
    });
  });

  /**
   * Should return the SamplerImpl
   */
  describe('never()', () => {
    it('should return a sampler instance', () => {
      const sampler = new Sampler();
      const samplerNever = sampler.never();
      assert.ok(samplerNever instanceof Sampler);
    });
  });

  /**
   * Should return the SamplerImpl
   */
  describe('probability()', () => {
    it('should return a sampler instance', () => {
      const PROBABILITY = 0.5;
      const sampler = new Sampler();
      const samplerProbability = sampler.probability(PROBABILITY);
      assert.ok(samplerProbability instanceof Sampler);
    });
  });

  /**
   * Should return true
   */
  describe('shouldSample() always', () => {
    it('should return true', () => {
      const root = new RootSpan(tracer);
      const sampler = new Sampler();
      sampler.always();
      const samplerShouldSampler = sampler.shouldSample(root.traceId);
      assert.ok(samplerShouldSampler);
    });
  });
  /**
   * Should return false
   */
  describe('shouldSample() never', () => {
    it('should return false', () => {
      const root = new RootSpan(tracer);
      const sampler = new Sampler();
      sampler.never();
      const samplerShouldSampler = sampler.shouldSample(root.traceId);
      assert.ok(!samplerShouldSampler);
    });
  });
});