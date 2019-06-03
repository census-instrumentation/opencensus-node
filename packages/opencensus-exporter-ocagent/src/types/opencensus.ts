/**
 * Copyright 2018, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { google } from './google';

// tslint:disable:no-namespace

export namespace opencensus.proto {
  export namespace agent {
    export namespace common.v1 {
      export interface Node {
        identifier?: opencensus.proto.agent.common.v1.ProcessIdentifier | null;
        libraryInfo?: opencensus.proto.agent.common.v1.LibraryInfo | null;
        serviceInfo?: opencensus.proto.agent.common.v1.ServiceInfo | null;
        attributes?: { [k: string]: string } | null;
      }

      export interface ProcessIdentifier {
        hostName?: string | null;
        pid?: number | null;
        startTimestamp?: google.protobuf.Timestamp | null;
      }

      export interface LibraryInfo {
        language?: opencensus.proto.agent.common.v1.LibraryInfo.Language | null;
        exporterVersion?: string | null;
        coreLibraryVersion?: string | null;
      }

      export namespace LibraryInfo {
        export enum Language {
          LANGUAGE_UNSPECIFIED = 0,
          CPP = 1,
          C_SHARP = 2,
          ERLANG = 3,
          GO_LANG = 4,
          JAVA = 5,
          NODE_JS = 6,
          PHP = 7,
          PYTHON = 8,
          RUBY = 9,
        }
      }

      export interface ServiceInfo {
        name?: string | null;
      }
    }
    export namespace trace.v1 {
      export interface CurrentLibraryConfig {
        node: opencensus.proto.agent.common.v1.Node;
        config: TraceConfig;
      }

      export interface UpdatedLibraryConfig {
        config: TraceConfig;
      }

      export interface ExportTraceServiceRequest {
        node: opencensus.proto.agent.common.v1.Node;
        spans: opencensus.proto.trace.v1.Span[];
      }

      export interface ExportTraceServiceResponse {}

      export interface ProbabilitySampler {
        samplingProbability?: number | null;
      }

      export interface ConstantSampler {
        decision?: boolean | null;
      }

      export interface RateLimitingSampler {
        qps?: number | Long | null;
      }

      export interface TraceConfig {
        probabilitySampler?: ProbabilitySampler | null;
        constantSampler?: ConstantSampler | null;
        rateLimitingSampler?: RateLimitingSampler | null;
      }
    }
  }

  export namespace trace.v1 {
    export interface Span {
      traceId?: Uint8Array | null;
      spanId?: Uint8Array | null;
      tracestate?: opencensus.proto.trace.v1.Span.Tracestate | null;
      parentSpanId?: Uint8Array | null;
      name?: opencensus.proto.trace.v1.TruncatableString | null;
      kind?: opencensus.proto.trace.v1.Span.SpanKind | null;
      startTime?: google.protobuf.Timestamp | null;
      endTime?: google.protobuf.Timestamp | null;
      attributes?: opencensus.proto.trace.v1.Span.Attributes | null;
      stackTrace?: opencensus.proto.trace.v1.StackTrace | null;
      timeEvents?: opencensus.proto.trace.v1.Span.TimeEvents | null;
      links?: opencensus.proto.trace.v1.Span.Links | null;
      status?: opencensus.proto.trace.v1.Status | null;
      sameProcessAsParentSpan?: google.protobuf.BoolValue | null;
      childSpanCount?: google.protobuf.UInt32Value | null;
    }

    export namespace Span {
      export interface Tracestate {
        entries?: opencensus.proto.trace.v1.Span.Tracestate.Entry[] | null;
      }

      export namespace Tracestate {
        export interface Entry {
          key?: string | null;
          value?: string | null;
        }
      }

      export enum SpanKind {
        SPAN_KIND_UNSPECIFIED = 0,
        SERVER = 1,
        CLIENT = 2,
      }

      export interface Attributes {
        attributeMap?: {
          [k: string]: opencensus.proto.trace.v1.AttributeValue;
        } | null;
        droppedAttributesCount?: number | null;
      }

      export interface TimeEvent {
        time?: google.protobuf.Timestamp | null;
        annotation?: opencensus.proto.trace.v1.Span.TimeEvent.Annotation | null;
        messageEvent?: opencensus.proto.trace.v1.Span.TimeEvent.MessageEvent | null;
      }

      export namespace TimeEvent {
        export interface Annotation {
          description?: opencensus.proto.trace.v1.TruncatableString | null;
          attributes?: opencensus.proto.trace.v1.Span.Attributes | null;
        }

        export interface MessageEvent {
          type?: opencensus.proto.trace.v1.Span.TimeEvent.MessageEvent.Type | null;
          id?: number | Long | null;
          uncompressedSize?: number | Long | null;
          compressedSize?: number | Long | null;
        }
        export namespace MessageEvent {
          export enum Type {
            TYPE_UNSPECIFIED = 0,
            SENT = 1,
            RECEIVED = 2,
          }
        }
      }

      export interface TimeEvents {
        timeEvent?: opencensus.proto.trace.v1.Span.TimeEvent[] | null;
        droppedAnnotationsCount?: number | null;
        droppedMessageEventsCount?: number | null;
      }

      export interface Link {
        traceId?: Uint8Array | null;

        spanId?: Uint8Array | null;

        type?: opencensus.proto.trace.v1.Span.Link.Type | null;

        attributes?: opencensus.proto.trace.v1.Span.Attributes | null;
      }

      export namespace Link {
        export enum Type {
          TYPE_UNSPECIFIED = 0,
          CHILD_LINKED_SPAN = 1,
          PARENT_LINKED_SPAN = 2,
        }
      }

      export interface Links {
        link?: opencensus.proto.trace.v1.Span.Link[] | null;
        droppedLinksCount?: number | null;
      }
    }
    export interface Status {
      code?: number | null;
      message?: string | null;
    }

    export interface AttributeValue {
      stringValue?: opencensus.proto.trace.v1.TruncatableString | null;
      intValue?: number | Long | null;
      boolValue?: boolean | null;
    }
    export interface StackTrace {
      stackFrames?: opencensus.proto.trace.v1.StackTrace.StackFrames | null;
      stackTraceHashId?: number | Long | null;
    }

    export namespace StackTrace {
      export interface StackFrame {
        functionName?: opencensus.proto.trace.v1.TruncatableString | null;
        originalFunctionName?: opencensus.proto.trace.v1.TruncatableString | null;
        fileName?: opencensus.proto.trace.v1.TruncatableString | null;
        lineNumber?: number | Long | null;
        columnNumber?: number | Long | null;
        loadModule?: opencensus.proto.trace.v1.Module | null;
        sourceVersion?: opencensus.proto.trace.v1.TruncatableString | null;
      }

      export interface StackFrames {
        frame?: opencensus.proto.trace.v1.StackTrace.StackFrame[] | null;
        droppedFramesCount?: number | null;
      }
    }

    export interface Module {
      module?: opencensus.proto.trace.v1.TruncatableString | null;
      buildId?: opencensus.proto.trace.v1.TruncatableString | null;
    }

    export interface TruncatableString {
      value?: string | null;
      truncatedByteCount?: number | null;
    }
  }
}
