import { ExporterOptions } from './exporterOptions';
import { Trace } from '../trace/model/trace';

export interface Exporter {
    
    emit(trace: Trace);
}