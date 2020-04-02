import {
    Exporter,
    ExporterConfig,
    Span,
    Logger,
    logger,
    View,
    Measure,
    AggregationData,
    ExporterBuffer
} from '@opencensus/core';

import * as ApplicationInsights from 'applicationinsights';
import { IllegalOptionsError } from './azure-stats';

export interface TraceParams {
    registeredViews: View[];
    registeredMeasures: Measure[];
    recordedData: { [key: string]: AggregationData[] };
}

export interface AzureTraceExporterOptions extends ExporterConfig {
    /**
     * The Instrumentation Key found in your application's Azure Monitor Application Insights
     * Overview page. Required.
     */
    instrumentationKey: string;

    /**
     * If specified, this will serve as the logger used by the exporter.
     * Optional, default to use whatever logger is registered with OpenCensus.
     */
    logger?: Logger;

    /**
     * Max size of telemetry batch.
     * If a batch exceeds this limit, it is immediately sent and a new batch is started
     */
    maxBatchSizeInBytes?: number;

    /**
     * How long to batch telemetry for before sending (milliseconds)
     */
    maxBatchInterval?: number;

    /**
     * If specified, this will override the default OpenCensus prefix of an
     * Azure Monitor metric. Optional.
     */
    prefix?: string;

}

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

    private options: AzureTraceExporterOptions;

    private buffer: ExporterBuffer;

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
    constructor(config: ExporterConfig, options: AzureTraceExporterOptions) {
        // Start with the default options, and overwrite the defaults with any options specified
        // in the constructor's options parameter. We do this before validating input so that
        // the logger gets configured with the user specified logger, if provided.
        this.options = { ...AZURE_TRACE_EXPORTER_DEFAULTS, ...options };
        this.buffer = new ExporterBuffer(this, config);

        // Verify that the options passed in have actual values (no undefined values)
        // for require parameters.
        if (!options.instrumentationKey) {
            this.options.logger.error('You must provide a valid instrumentation key.');
            throw new IllegalOptionsError('You must provide a valid instrumentation key.');
        } 

        // Configure the Application Insights SDK to use the Instrumentation Key from our options.
        ApplicationInsights.setup(this.options.instrumentationKey).start();
    }
    publish(spans: Span[]): Promise<string | number | void> {
        // Iterate over all root spans formating the data the way we want
        spans.map((root) => {
        const ROOT_STR = `RootSpan: {traceId: ${root.traceId}, spanId: ${
            root.id}, name: ${root.name} }`;
  
        const SPANS_STR: string[] = root.spans.map(
            (span) => [`\t\t{spanId: ${span.id}, name: ${span.name}}`].join(
                '\n'));
  
        const result: string[] = [];
        result.push(
            ROOT_STR + '\n\tChildSpans:\n' +
            `${SPANS_STR.join('\n')}`);
        // console.log(`${result}`);
        });
  
        ApplicationInsights.defaultClient.trackTrace({
            message: "Telemtry trace",
            severity: ApplicationInsights.Contracts.SeverityLevel.Information,
            properties: spans.map.arguments.result
        });
        return Promise.resolve();
    }
    
    onStartSpan(span: Span): void {
        throw new Error("Method not implemented.");
    }
    onEndSpan(span: Span): void {
        this.buffer.addToBuffer(span);
    }
}
