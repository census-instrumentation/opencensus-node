import { ExporterOptions } from './exporterOptions';

export interface Exporter {

    constructor(options?: ExporterOptions);
    
    emit();

    generateTraceId(): string;
    
    generateSpanId(): string;
    
    generateSpanName(): string;
}