import {
    ExporterConfig,
    StatsEventListener
} from '@opencensus/core';

/**
 * Options for Azure Monitor configuration.
 */
export interface AzureStatsExporterOptions extends ExporterConfig {

}

/**
 * Formats and sends Stats to Azure Monitor.
 */
export class AzureStatsExporter implements StatsEventListener {

    /**
     * Is called whenever a view is registered.
     * @param view The registered view.
     */
    onRegisterView(view: import("@opencensus/core").View): void {
        throw new Error("Method not implemented.");
    }    
    
    /**
     * Is called whenever a measure is recorded.
     * @param views The views related to the measurement
     * @param measurement The recorded measurement
     * @param tags The tags to which the value is applied
     */
    onRecord(views: import("@opencensus/core").View[], measurement: import("@opencensus/core").Measurement, tags: Map<import("@opencensus/core").TagKey, import("@opencensus/core").TagValue>): void {
        throw new Error("Method not implemented.");
    }

    /**
     * Creates an Azure Monitor Stats exporter with an AzureStatsExporterOptions.
     */
    start(): void {
        throw new Error("Method not implemented.");
    }

    /**
     * Clear the interval timer to stop uploading metrics. It should be called
     * whenever the exporter is not needed anymore.
     */
    stop(): void {
        throw new Error("Method not implemented.");
    }

}