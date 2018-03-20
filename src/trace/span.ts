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

import {Clock} from '../internal/clock';
import {Trace} from './trace';
import {debug, randomSpanId} from '../internal/util'
import {TracerComponent} from './types/tracetypes'


export class Span extends TracerComponent {

    private trace: TracerComponent;   
    private _parentSpanId: string;
    
   constructor(trace: TracerComponent) {
      super()
      this.trace = trace;
      this.setId(randomSpanId());
    }

    public get traceId() : string {
        return this.trace.id;
    }

    public set parentSpanId(parentSpanId : string) {
        this._parentSpanId = parentSpanId;
    }

    public get parentSpanId() : string {
        return this._parentSpanId;
    }
        
    public get traceContext() {
        return {
          traceId: this.trace.id.toString(),
          spanId: this.id.toString(),
          options: 1  // always traced
        };
    }
    
    public start() {
        super.start();
         debug('starting span  %o', {id: this.id, traceId: this.traceId, name: this.name })
    }

    public end(): void {
        super.end();
        debug('ending span  %o', 
            {spanId: this.id, 
             traceId: this.trace.id, 
             name: this.name ,
             startTime: this.startTime, 
             endTime: this.endTime, 
             duration: this.duration}
        )
       
    }
    

}
