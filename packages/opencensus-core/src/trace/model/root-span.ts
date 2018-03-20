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

import {Span} from './span' 
import {Clock} from '../internal/clock'
import * as uuid from 'uuid';
import {debug} from '../internal/util'
import {TracerComponent} from './types/tracetypes'

export class Trace extends TracerComponent {

    private spans: Span[] = [];

    constructor() {
        super()
       this.setId((uuid.v4().split('-').join('')));
    }
     
    public start() {
        super.start()     
        debug('starting trace  %o', {id: this.id})
    }
    
    public end() {
        super.end()

        //TODO - Define logic for list of spans
        this.spans.forEach(function (span) {
            if (span.ended || !span.started) return
            span.truncate()
        })
     
        debug('ending trace  %o', 
            {id: this.id, name: this.name, startTime: this.startTime, endTime: this.endTime, duration: this.duration})
    }

    public startSpan(name: string, type: string) {
        let newSpan = new Span(this);
        newSpan.name = name
        newSpan.type = type
        newSpan.start();
        this.spans.push(newSpan);
        return newSpan;
    }

}

