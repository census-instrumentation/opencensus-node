
import {IncomingMessage, ServerResponse} from 'http';
import * as v1API from './v1';

export interface SpanContext {
  /** Trace ID */
  traceId: string;
  /** Span ID */
  spanId: string;
  /** Options */
  options?: number;
};

export interface API {
  extract(req: IncomingMessage): SpanContext|null;
  inject(res: ServerResponse, spanContext: SpanContext): void;
  generateNewSpanContext(): SpanContext;
};

export const v1: API = v1API;

