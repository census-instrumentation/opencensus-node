import {
    Exporter,
    ExporterConfig,
    Span
} from '@opencensus/core';

export interface AzureTraceExporterOptions extends ExporterConfig {

}

export class AzureTraceExporter implements Exporter {

    publish(spans: Span[]): Promise<string | number | void> {
        throw new Error("Method not implemented.");
    }
    
    onStartSpan(span: Span): void {
        throw new Error("Method not implemented.");
    }
    onEndSpan(span: Span): void {
        throw new Error("Method not implemented.");
    }
}
