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

export class Sampler{
     traceId:       string;
     spanId:        string;
     isRemote:      boolean;
     idUpperBound:  number;

     /**
      * 
      * @param traceId 
      * @param spanId 
      * @param isRemote 
      */
     constructor(traceId?:string, spanId?:string, isRemote?:boolean){
         debug('Samplre constructor')
         if(traceId){ 
             this.traceId   = traceId;
         }
         if(spanId){
            this.spanId    = spanId;
         }
        this.isRemote  = isRemote || false;

     }

     public always(): Sampler{
         this.idUpperBound = maxNumber;
         return this;
     }

     public never(): Sampler{
         this.idUpperBound = minNumber;
         return this;
     }

     public probability(probability:number): Sampler{
        if(probability < minNumber){
            return this.never();

        } else if (probability > maxNumber){
            return this.always();

        }

        this.idUpperBound = probability * maxNumber;
        return this;
     }

     public continue (traceId:string):boolean{
        debug('Samplre continue')
        let lower_bytes = traceId.substring(16)
        let lower_long: number
        debug('SAMPLER CONTINUE lower_bytes :',lower_bytes)

        lower_long = parseInt(lower_bytes, 16);

        debug('SAMPLER CONTINUE lower_long :',lower_long)
        debug('SAMPLER CONTINUE this.idUpperBound :',this.idUpperBound)
        debug('SAMPLER CONTINUE diff :',lower_long - this.idUpperBound)

        if(lower_long <= this.idUpperBound){
            debug('trace sampler TRUE')
            return true
        }else{
            debug('trace sampler FALSE')
            return false;
        }
     }

 }