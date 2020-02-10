import {
    Exporter,
    ExporterConfig
} from '@opencensus/core';

export interface AzureTraceExporterOptions extends ExporterConfig {

}

export class AzureTraceExporter implements Exporter {

    publish(spans: import("@opencensus/core").Span[]): Promise<string | number | void> {
        throw new Error("Method not implemented.");
    }
    
    onStartSpan(span: import("@opencensus/core").Span): void {
        throw new Error("Method not implemented.");
    }
    onEndSpan(span: import("@opencensus/core").Span): void {
        throw new Error("Method not implemented.");
    }
}