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

var opencensus = require('opencensus-nodejs');
var http = require('http');
var fs = require('fs');

// Register trace exporters to export the collected data.
var tracing = require('opencensus-nodejs').addStackdriver('project-id').start();
var tracer = tracing.Tracer;

var options = {
    name: 'fs.writeFileSync'
};

// Create root span for GET request
tracer.startRootSpan(options, (span) => {
    http.get('http://httpbin.org/image/jpeg', function (response) {

        var data = [];

        response.on('data', (chunk) => {
            data.push(chunk);
        });

        response.on('end', () => {
            var filename = 'file';
            // Create a child span for file writing operation
            var childSpan = tracer.startSpan(filename);
            var buffer = Buffer.concat(data);
            fs.writeFileSync(filename + '.jpeg', buffer, 'utf-8');
            
            // Finish both root span and child span, since the operations 
            // has ended.
            childSpan.end();
            span.end();
        });
        console.log('No more data in response.');
    });
});
