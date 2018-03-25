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


import {ExporterOptions} from './exporterOptions'
import { RootSpan } from '../trace/model/rootspan'
import { OnEndSpanEventListener } from '../trace/types/tracetypes'

export interface Exporter extends OnEndSpanEventListener  {
    writeTrace(root: RootSpan);
}

export class NoopExporter implements Exporter {

    writeTrace(root: RootSpan) {}
    onEndSpan(root:RootSpan){}
}

export class ConsoleLogExporter implements Exporter {

    writeTrace(root: RootSpan) {
        let rootStr: string = ( `
        RootSpan: {traceId: ${root.traceId}, spanId: ${root.id}, name: ${root.name} }
        `);
        let spansStr: string[] = 
           root.spans.map((span)=>`   ChildSpan: {traceId: ${span.traceId}, spanId: ${span.id}, name: ${span.name} }
        `)
        let result:string[] = [];

        result.push(rootStr)
        result.push(`${spansStr.join("")}`)
        console.log(`${result}`)
    }

    onEndSpan(root:RootSpan){
        this.writeTrace(root)
    }
}

