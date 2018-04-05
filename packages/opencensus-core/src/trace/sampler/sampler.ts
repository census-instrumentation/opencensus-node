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

import { debug, randomSpanId } from '../../internal/util'


const minNumber = 1e-4;
const maxNumber = 0xffffffffffffffff;

/**
 * Class Sampler
 */
export class Sampler {
    traceId: string;
    private idUpperBound: number;

    /**
     * @param traceId Used for probability calculation
     * @param spanId todo: integration with propagation class
     * @param isRemote todo: integration with propagation class
     */
    constructor(traceId?: string, spanId?: string, isRemote?: boolean) {
        if (traceId) {
            this.traceId = traceId;
        }
    }

    /**
     * @description Set idUpperBound with maxNumber
     * @returns a Sampler object
     */
    public always(): Sampler {
        this.idUpperBound = maxNumber;
        return this;
    }

    /**
     * @description Set idUpperBound with minNumber
     * @returns a Sampler object
     */
    public never(): Sampler {
        this.idUpperBound = minNumber;
        return this;
    }

    /**
     * @description Set idUpperBound with the probability. If probability 
     * parameter is bigger then 1 set always. If probability parameter less 
     * than 0, set never.
     * @param probability probability between 0 and 1 
     * @returns a Sampler object
     */
    public probability(probability: number): Sampler {
        if (probability < minNumber) {
            return this.never();

        } else if (probability > maxNumber) {
            return this.always();

        }

        this.idUpperBound = probability * maxNumber;
        return this;
    }

    /**
     * @description 
     * @param traceId 
     * @returns a boolean
     */
    public shouldSample(traceId: string): boolean {
        const lower_bytes = traceId.substring(16)
        const lower_long = parseInt(lower_bytes, 16);

        if (lower_long <= this.idUpperBound) {
            return true
        } else {
            return false;
        }
    }

}