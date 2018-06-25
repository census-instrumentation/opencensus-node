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

import {randomSpanId} from '../../internal/util';
import {Sampler} from './types';


const MIN_NUMBER = Number.MIN_VALUE;
const MAX_NUMBER = Number.MAX_VALUE;


/**  Sampler that samples every trace. */
export class AlwaysSampler implements Sampler {
  readonly description = 'always';

  shouldSample(traceId: string): boolean {
    return true;
  }
}

/** Sampler that samples no traces. */
export class NeverSampler implements Sampler {
  readonly description = 'never';

  shouldSample(traceId: string): boolean {
    return false;
  }
}

/** Sampler that samples a given fraction of traces. */
export class ProbabilitySampler implements Sampler {
  private idUpperBound: number;
  readonly description: string;

  /**
   * Constructs a new Probability Sampler instance.
   */
  constructor(probability: number) {
    this.description = `probability.(${probability})`;
    this.idUpperBound = probability * MAX_NUMBER;
  }


  /**
   * Checks if trace belong the sample.
   * @param traceId Used to check the probability
   * @returns a boolean. True if the traceId is in probability
   * False if the traceId is not in probability.
   */
  shouldSample(traceId: string): boolean {
    const LOWER_BYTES = traceId ? traceId.substring(16) : '0';
    // tslint:disable-next-line:ban Needed to parse hexadecimal.
    const LOWER_LONG = parseInt(LOWER_BYTES, 16);

    if (LOWER_LONG <= this.idUpperBound) {
      return true;
    } else {
      return false;
    }
  }
}


/** Builder class of Samplers */
export class SamplerBuilder {
  private static readonly ALWAYS = new AlwaysSampler();
  private static readonly NEVER = new NeverSampler();

  /**
   * If probability parameter is bigger then 1 return AlwaysSampler instance.
   * If probability parameter is less than 0 returns NeverSampler instance.
   * Else returns a Probability Sampler
   *
   * @param probability probability between 0 and 1
   * @returns a Sampler object
   */
  static getSampler(probability: number): Sampler {
    if (probability >= 1.0) {
      return SamplerBuilder.ALWAYS;
    } else if (probability <= 0) {
      return SamplerBuilder.NEVER;
    }
    return new ProbabilitySampler(probability);
  }
}
