import { ExporterOptions } from './exporterOptions';
import { Trace } from '../trace/trace';

export interface Exporter {
    
    emit(trace: Trace);
}