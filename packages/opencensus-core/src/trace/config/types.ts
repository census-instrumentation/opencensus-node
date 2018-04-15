/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

/**
 * This interface represent the probability of a tracer.
 */
export interface Sampler {

  /**
   * Set idUpperBound with MAX_NUMBER that is equivalent the probability be 1
   * @returns a Sampler object
   */

  always(): Sampler;
  /**
   * Set idUpperBound with MIN_NUMBER that is equivalent the probability be 0
   * @returns a Sampler object
   */

  never(): Sampler;

  /**
   * Set idUpperBound with the probability. If probability
   * parameter is bigger then 1 set always. If probability parameter less
   * than 0, set never.
   * @param probability probability between 0 and 1
   * @returns a Sampler object
   */
  probability(probability: number): Sampler;

  /**
   * Checks if trace belong the sample.
   * @param traceId Used to check the probability
   * @returns a boolean. True if the traceId is in probability
   * False if the traceId is not in probability.
   */
  shouldSample(traceId: string): boolean;
}
