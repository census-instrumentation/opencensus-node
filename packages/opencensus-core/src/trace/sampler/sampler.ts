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
import * as types from './types';


const MIN_NUMBER = Number.MIN_VALUE;
const MAX_NUMBER = Number.MAX_VALUE;


/** This class represent the probability of a tracer. */
export class Sampler implements types.Sampler {
  private idUpperBound: number;
  description: string;

  /**
   * Constructs a new Sampler instance.
   */
  constructor() {}

  /**
   * Sets idUpperBound with MAX_NUMBER that is equivalent the probability be 1
   * @returns a Sampler object
   */
  always(): Sampler {
    this.description = 'always';
    this.idUpperBound = MAX_NUMBER;
    return this;
  }

  /**
   * Sets idUpperBound with MIN_NUMBER that is equivalent the probability be 0
   * @returns a Sampler object
   */
  never(): Sampler {
    this.description = 'never';
    this.idUpperBound = MIN_NUMBER;
    return this;
  }

  /**
   * Sets idUpperBound with the probability. If probability
   * parameter is bigger then 1 set always. If probability parameter less
   * than 0, set never.
   * @param probability probability between 0 and 1
   * @returns a Sampler object
   */
  probability(probability: number): Sampler {
    if (probability >= 1.0) {
      return this.always();
    } else if (probability <= 0) {
      return this.never();
    }
    this.description = `probability.(${probability})`;
    this.idUpperBound = probability * MAX_NUMBER;
    return this;
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