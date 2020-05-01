/**
 * Copyright 2018 OpenCensus Authors.
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

import {
    Exporter,
    ExporterConfig,
    Span,
    logger,
    ExporterBuffer
} from '@opencensus/core';

import * as ApplicationInsights from 'applicationinsights';
import { 
    IllegalOptionsError,
    AzureTraceExporterOptions,
    TraceParams
} from './types';

/**
 * Configuration defaults for an AzureTraceExporter.
 */
const AZURE_TRACE_EXPORTER_DEFAULTS: AzureTraceExporterOptions = {
    instrumentationKey: 'undefined',
    maxBatchSizeInBytes: 10000,
    maxBatchInterval: 15000,
    prefix: 'OpenCensus',
    logger: logger.logger()
}

export class AzureTraceExporter implements Exporter {

    /**Custom options for Trace Exporter */
    private options: AzureTraceExporterOptions;

     /** Buffer object to store the spans. */
    private buffer: ExporterBuffer;

    /** Exporter Config Object for Azure Monitor */
    private config: ExporterConfig;

    // Define all other exporter variables.
    private timer: NodeJS.Timer;

    private traceParams: TraceParams = {
        registeredViews: [],
        registeredMeasures: [],
        recordedData: {},
    };

    /**
     * Configures a new Trace Exporter given a set of options.
     * @param options Specific configuration information to use when constructing the exporter.
     */
    constructor(options: AzureTraceExporterOptions) {
        // Start with the default options, and overwrite the defaults with any options specified
        // in the constructor's options parameter. We do this before validating input so that
        // the logger gets configured with the user specified logger, if provided.
        this.options = { ...AZURE_TRACE_EXPORTER_DEFAULTS, ...options };

        // Init ExporterConfig
        this.config = {
            bufferSize: this.options.maxBatchSizeInBytes,
            bufferTimeout: this.options.maxBatchInterval,
            logger: this.options.logger
        }
        this.buffer = new ExporterBuffer(this, this.config);

        // Verify that the options passed in have actual values (no undefined values)
        // for require parameters.
        if (!options.instrumentationKey) {
            this.options.logger.error('You must provide a valid instrumentation key.');
            throw new IllegalOptionsError('You must provide a valid instrumentation key.');
        }

        // Configure the Application Insights SDK to use the Instrumentation Key from our options.
        ApplicationInsights.setup(this.options.instrumentationKey).start();
    }

    /**
    * Sends the spans information to the console.
    * @param spans The stored spans
    */
    publish(spans: Span[]): Promise<string | number | void> {
        // Iterate over all root spans formating the data the way we want
        this.options.logger.debug(spans.length);
        let ROOT_NAME = "";
        let children : { [key: string]: string} = {};
        spans.map((root) => {
            const ROOT_STR = `RootSpan: {traceId: ${root.traceId}, spanId: ${
                root.id}, name: ${root.name} }`;

            const SPANS_STR: string[] = root.spans.map(
                (span) => [`\t\t{spanId: ${span.id}, name: ${span.name}}`].join(
                    '\n'));

            root.spans.map(
                (span) => children[span.id] = span.name
            );
            const result: string[] = [];
            result.push(
                ROOT_STR + '\n\tChildSpans:\n' +
                `${SPANS_STR.join('\n')}`);
            this.options.logger.debug('Result string <azure-trace.ts:121>: ' + result[0]);

            ROOT_NAME = root.name;

        });

        ApplicationInsights.defaultClient.trackTrace({
            message: ROOT_NAME,
            severity: ApplicationInsights.Contracts.SeverityLevel.Information,
            properties: children
        });

        return Promise.resolve();
    }

    /** 
    * Our onStartSpan will do nothing. The exporting logic will be concentrated
    * at the onEndSpan event.
    */
    onStartSpan(span: Span): void {
    }

    /**
    * Called whenever a span is ended.
    * @param span Ended span.
    */
    onEndSpan(span: Span): void {
        // We will just add the ended span to the buffer and wait for it to call
	    // the exporter back giving all the stored spans.
        if (!span.isRootSpan()) return;
        this.buffer.addToBuffer(span);
        this.options.logger.debug('Added to buffer: ' + span.name);
    }
}
