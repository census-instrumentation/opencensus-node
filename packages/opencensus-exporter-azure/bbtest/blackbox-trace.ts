/**
 * Copyright 2020 OpenCensus Authors.
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

// Import Core OpenCensus and our Azure Exporter module.
const OpenCensus = require('@opencensus/core');
const tracing = require('@opencensus/nodejs');
const AzureTrace = require('../build/src/azure-trace');
const ApplicationInsights = require('applicationinsights');

// Start the global tracing object
const tracer = tracing.start({samplingRate: 1}).tracer;

function doWork() {
    for (let i = 0; i < 10; i++) {
        const span = tracer.startChildSpan('doWork');
        span.start();

        for (let j = 0; j < 100000; j++);
        span.addAnnotation('Invoking doWork');
        for (let j = 0; j < 20000000; j++);
        span.end();
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function exportSingleTrace() {
    // Construct and register an AzureStatsExporter with the OpenCensus library.

    const exporterOptions = {
        instrumentationKey: 'xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        logger: new OpenCensus.logger.ConsoleLogger(process.argv[2] || 'info'),
        maxBatchInterval: 1
    };

    const exporter = new AzureTrace.AzureTraceExporter(exporterOptions);
    // OpenCensus.globalStats.registerExporter(exporter);

    // Register the Azure trace exporter so that the global object will utilize
    // the Azure exporter to push traces
    tracer.registerSpanEventListener(exporter);

    // Start an arbitrary root span
    tracer.startRootSpan({ name: 'root-s01'}, rootSpan => {
        // Do some arbitrary work, and create children spans while we are at it.
        for(let i = 0; i < 10; i++) {
            doWork();
        }
        // End the root span, triggering the publishing of it.
        rootSpan.end();
    });

    // Pause execution of the script for 20 seconds, to allow the ExportBuffer that controls
    // the publish() method within the Trace Exporter time to complete logging
    await delay(20 * 1000);
}

exportSingleTrace();