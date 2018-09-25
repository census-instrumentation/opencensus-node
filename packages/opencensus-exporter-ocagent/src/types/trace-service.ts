import * as grpc from 'grpc';
import {opencensus} from './opencensus';

/**
 * Trace Service types
 */
export type TraceServiceConfigStream = grpc.ClientDuplexStream<
    opencensus.proto.agent.trace.v1.CurrentLibraryConfig,
    opencensus.proto.agent.trace.v1.UpdatedLibraryConfig>;

export type TraceServiceExportStream = grpc.ClientDuplexStream<
    opencensus.proto.agent.trace.v1.ExportTraceServiceRequest,
    opencensus.proto.agent.trace.v1.ExportTraceServiceRequest>;

export interface TraceServiceClient extends grpc.Client {
  config: () => TraceServiceConfigStream;
  export: () => TraceServiceExportStream;
}