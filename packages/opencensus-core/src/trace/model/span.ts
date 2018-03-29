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

import { Clock } from '../../internal/clock'
import { RootSpan } from './rootspan'
import { debug, randomSpanId } from '../../internal/util'
import { SpanBaseModel, TraceContext } from '../types/tracetypes'


export class Span extends SpanBaseModel {

    private root: RootSpan;
  //  private _parentSpanId: string;

    constructor(root: RootSpan) {
        super()
        this.root = root;
    }

    public get traceId(): string {
        return this.root.traceId;
    }

    public get parentSpanId(): string {
        return this.root.id;
    }

    public get traceContext(): TraceContext {
        return {
            traceId: this.traceId.toString(),
            spanId: this.id.toString(),
            options: 1  // always traced
        };
    }

    public start() {
        super.start();
        debug('starting span  %o',
            {
                traceId: this.traceId,
                spanId: this.id,
                name: this.name
            })
    }

    private notifyEnd () {
        this.root.onEndSpan(this);
    }

    public end(): void {
        // if(this.sampler.continue(this.traceId)) {
            
            super.end();
            this.notifyEnd();
            debug('ending span  %o',
                {
                    spanId: this.id,
                    traceId: this.traceId,
                    name: this.name,
                    startTime: this.startTime,
                    endTime: this.endTime,
                    duration: this.duration
                });
        // }
    }


}
