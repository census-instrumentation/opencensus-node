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

import { Span } from './span'
import { Clock } from '../../internal/clock'
import * as uuid from 'uuid';
import { debug } from '../../internal/util'
import { SpanBaseModel, TraceContext, OnEndSpanEventListener } from '../types/tracetypes'
import { Tracer } from './tracer'
import { Sampler } from './sampler'

export class RootSpan extends SpanBaseModel implements OnEndSpanEventListener {

    private tracer: Tracer;
    private _spans: Span[];
    private _traceId: string;

    constructor(tracer: Tracer, context?: TraceContext ) {
        super()
        this.tracer = tracer;
        this._traceId = context&&context.traceId?context.traceId:(uuid.v4().split('-').join(''));
        this._spans = [];
    }

    public get spans() {
        return this._spans;
    }

    public get traceId() {
        return this._traceId;
    }

    public start() {
        super.start()
        debug('starting %s  %o', this._className, { traceId: this.traceId, id: this.id })
    }

    public end() {
        super.end()

        //TODO - Define logic for list of spans
        this._spans.forEach(function (span) {
            if (span.ended || !span.started) return
            span.truncate()
        })

        debug('ending %s  %o',
            this._className,
            {   id: this.id,
                traceId: this.traceId,
                name: this.name,
                startTime: this.startTime,
                endTime: this.endTime,
                duration: this.duration })
        
        this.tracer.onEndSpan(this)
    }

    public onEndSpan(span: Span) {
        debug('%s notified ending by %o',{id: span.id, name: span.name})
    }

    public startSpan(name: string, type: string) {
        if(!this.sampler == null || this.sampler.continue(this._traceId)){
            let newSpan = new Span(this);
            newSpan.name = name
            newSpan.type = type
            newSpan.start();
            this._spans.push(newSpan);
            return newSpan;
        }else{
            //TODO
            debug("ELDREY -> RootSpan return startSpan null")
            return
        }
    }

}

