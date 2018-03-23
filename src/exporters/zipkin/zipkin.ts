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


import {Exporter} from "../exporter"
import {ZipkinOptions} from "./options"
import { Trace } from "../../trace/model/trace";
import * as http from "http"

export class Zipkin implements Exporter {
    url: string;
    serviceName: string;

    constructor(options: ZipkinOptions) {
        this.url = options.url;
        this.serviceName = options.serviceName;
    }
    emit(trace: Trace) {
        let spans = [];

        let spanRoot = {
            "traceId": trace.traceId,
            "name": trace.name,
            "id": trace.id,
            "kind": "CLIENT",
            "timestamp": trace.startTime,
            "duration": trace.duration,
            "debug": true,
            "shared": true,
            "localEndpoint": {
                "serviceName": this.serviceName
            }
        }
        spans.push(spanRoot);

        for (let span of trace.spans) {
            let spanObj = {
                "traceId": trace.traceId,
                "parentId": trace.id,
                "name": span.name,
                "id": span.id,
                "kind": "CLIENT",
                "timestamp": span.startTime,
                "duration": span.duration,
                "debug": true,
                "shared": true,
                "localEndpoint": {
                    "serviceName": this.serviceName
                }
            }
            spans.push(spanObj);
        }

        const options = {
            hostname: 'localhost',
            port: 9411,
            path: '/api/v2/spans',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };


        const req = http.request(options, (res) => {
            console.log(`STATUS: ${res.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                console.log(`BODY: ${chunk}`);
            });
            res.on('end', () => {
                console.log('No more data in response.');
            });
        });

        req.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
        });

        // write data to request body
        req.write(spans);
        req.end();
    }
}