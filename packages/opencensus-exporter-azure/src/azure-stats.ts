import {
    ExporterConfig,
    StatsEventListener
} from '@opencensus/core';

export interface AzureStatsExporterOptions extends ExporterConfig {

}

export class AzureStatsExporter implements StatsEventListener {

    onRegisterView(view: import("@opencensus/core").View): void {
        throw new Error("Method not implemented.");
    }    onRecord(views: import("@opencensus/core").View[], measurement: import("@opencensus/core").Measurement, tags: Map<import("@opencensus/core").TagKey, import("@opencensus/core").TagValue>): void {
        throw new Error("Method not implemented.");
    }

    start(): void {
        throw new Error("Method not implemented.");
    }

    stop(): void {
        throw new Error("Method not implemented.");
    }

}