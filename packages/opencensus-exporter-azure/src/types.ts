import {
    Logger,
    View,
    Measure,
    AggregationData,
    ExporterConfig
} from '@opencensus/core';

export interface StatsParams {
    registeredViews: View[];
    registeredMeasures: Measure[];
    recordedData: { [key: string]: AggregationData[] };
}

export enum ExportMode {
    SINGLE_VALUE = 0,
    BATCH = 1
}

export enum AggregationMethod {
    AVERAGE = 0,
    MIN = 1,
    MAX = 2,
    SUM = 3,
    COUNT = 4
}

/**
 * Options for Azure Monitor configuration.
 */
export interface AzureStatsExporterOptions extends ExporterConfig {

    /**
     * The Instrumentation Key found in your application's Azure Monitor Application Insights
     * Overview page. Required.
     */
    instrumentationKey: string;

    /**
     * If specified, dictates the mode the exporter will function in.
     * Optional, defaults to ExportMode.SINGLE_VALUE.
     */
    exportMode?: ExportMode;

    /**
     * If specified, defines the number of milliseconds between uploading metrics
     * to Azure Monitor. Optional, defaults to 60,000 (1 minute).
     */
    periodInMillis?: number;

    /**
     * If specified, this will override the default OpenCensus prefix of an
     * Azure Monitor metric. Optional.
     */
    prefix?: string;

    /**
     * The aggregation method if batch exporting is to be used.
     * Optional, defaults to AggregationMethod.AVERAGE.
     */
    aggregationMethod?: AggregationMethod;

    /**
     * If specified, this will serve as the logger used by the exporter.
     * Optional, default to use whatever logger is registered with OpenCensus.
     */
    logger?: Logger;

    /**
     * If specified, this function will be called whenever an error occurs uploading
     * stats to Azure monitor. Optional.
     */
    onMetricUploadError?: (err: Error) => void;

}

export class IllegalOptionsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IllegalOptionsError';
    }
}

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