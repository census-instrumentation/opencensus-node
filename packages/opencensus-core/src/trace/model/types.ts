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

import * as loggerTypes from '../../common/types';
import * as configTypes from '../config/types';
import {Propagation} from '../propagation/types';
import * as samplerTypes from '../sampler/types';



/** Default type for functions */
// tslint:disable:no-any
export type Func<T> = (...args: any[]) => T;

/** Maps a label to a string, number or boolean. */
export interface Attributes {
  [attributeKey: string]: string|number|boolean;
}

/**
 * The status of a Span by providing a standard code in conjunction
 * with an optional descriptive message.
 */
export interface Status {
  /** The status code. */
  code: number;
  /** A developer-facing error message. */
  message?: string;
}

/** A text annotation with a set of attributes. */
export interface Annotation {
  /** A user-supplied message describing the event. */
  description: string;
  /** A timestamp for the event event. */
  timestamp: number;
  /** A set of attributes on the annotation. */
  attributes: Attributes;
}

/** An event describing a message sent/received between Spans. */
export interface MessageEvent {
  /** A timestamp for the event. */
  timestamp: number;
  /** Indicates whether the message was sent or received. */
  type: string;
  /** An identifier for the MessageEvent's message. */
  id: string;
  /** The number of uncompressed bytes sent or received. */
  uncompressedSize?: number;
  /**
   * The number of compressed bytes sent or received. If zero or
   * undefined, assumed to be the same size as uncompressed.
   */
  compressedSize?: number;
}

/**
 * A pointer from the current span to another span in the same trace or in a
 * different trace.
 */
export interface Link {
  /** The trace ID for a trace within a project. */
  traceId: string;
  /** The span ID for a span within a trace. */
  spanId: string;
  /** The relationship of the current span relative to the linked. */
  type: string;
  /** A set of attributes on the link. */
  attributes: Attributes;
}

/** Defines the trace options */
export interface TraceOptions {
  /** Root span name */
  name: string;
  /** Trace context */
  spanContext?: SpanContext;
  /** Span kind */
  kind?: string;
}

export type TraceState = string;

/** Defines the span context */
export interface SpanContext {
  /** Trace ID */
  traceId: string;
  /** Span ID */
  spanId: string;
  /** Options */
  options?: number;
  /** TraceState */
  traceState?: TraceState;
}

/** Defines an end span event listener */
export interface SpanEventListener {
  /** Happens when a span is ended */
  onStartSpan(span: RootSpan): void;
  onEndSpan(span: RootSpan): void;
}

/** Interface for Span */
export interface Span {
  /** The Span ID of this span */
  readonly id: string;

  /** If the parent span is in another process. */
  remoteParent: boolean;

  /** The span ID of this span's parent. If it's a root span, must be empty */
  parentSpanId: string;

  /** The resource name of the span */
  name: string;

  /** Kind of span. */
  kind: string;

  /** An object to log information to */
  logger: loggerTypes.Logger;

  /** A final status for this span */
  status: Status;

  /** A set of attributes, each in the format [KEY]:[VALUE] */
  attributes: Attributes;

  /** A text annotation with a set of attributes. */
  annotations: Annotation[];

  /** An event describing a message sent/received between Spans. */
  messageEvents: MessageEvent[];

  /** Pointers from the current span to another span */
  links: Link[];

  /** true if span is a RootSpan */
  isRootSpan: boolean;

  /** Trace id asscoiated with span. */
  readonly traceId: string;

  /** Trace state associated with span */
  readonly traceState: TraceState;

  /** Indicates if span was started. */
  readonly started: boolean;

  /** Indicates if span was ended. */
  readonly ended: boolean;

  /**
   * Gives a timestap that indicates the span's start time in RFC3339 UTC
   * "Zulu" format.
   */
  readonly startTime: Date;

  /**
   * Gives a timestap that indicates the span's end time in RFC3339 UTC
   * "Zulu" format.
   */
  readonly endTime: Date;

  /**
   * Gives a timestap that indicates the span's duration in RFC3339 UTC
   * "Zulu" format.
   */
  readonly duration: number;

  /** Gives the TraceContext of the span. */
  readonly spanContext: SpanContext;

  /**
   * Adds an atribute to the span.
   * @param key Describes the value added.
   * @param value The result of an operation.
   */
  addAttribute(key: string, value: string|number|boolean): void;

  /**
   * Adds an annotation to the span.
   * @param description Describes the event.
   * @param attributes A set of attributes on the annotation.
   * @param timestamp A timestamp for this event.
   */
  addAnnotation(
      description: string, attributes?: Attributes, timestamp?: number): void;

  /**
   * Adds a link to the span.
   * @param traceId The trace ID for a trace within a project.
   * @param spanId The span ID for a span within a trace.
   * @param type The relationship of the current span relative to the linked.
   * @param attributes A set of attributes on the link.
   */
  addLink(
      traceId: string, spanId: string, type: string,
      attributes?: Attributes): void;

  /**
   * Adds a message event to the span.
   * @param type The type of message event.
   * @param id An identifier for the message event.
   * @param timestamp A timestamp for this event.
   */
  addMessageEvent(type: string, id: string, timestamp?: number): void;

  /**
   * Sets a status to the span.
   * @param code The status code.
   * @param message optional A developer-facing error message.
   */
  setStatus(code: number, message?: string): void;

  /** Starts a span. */
  start(): void;

  /** Ends a span. */
  end(): void;

  /** Forces to end a span. */
  truncate(): void;
}

/** Interface for RootSpan */
export interface RootSpan extends Span {
  /** Get the span list from RootSpan instance */
  readonly spans: Span[];

  /** Starts a new Span instance in the RootSpan instance */
  startChildSpan(name: string, type: string): Span;
}


/** Interface for Tracer */
export interface Tracer extends SpanEventListener {
  /** Get and set the currentRootSpan to tracer instance */
  currentRootSpan: RootSpan;

  /** A sampler that will decide if the span will be sampled or not */
  sampler: samplerTypes.Sampler;

  /** A configuration for starting the tracer */
  logger: loggerTypes.Logger;

  /** A propagation instance */
  readonly propagation: Propagation;

  /** Get the eventListeners from tracer instance */
  readonly eventListeners: SpanEventListener[];

  /** Get the active status from tracer instance */
  readonly active: boolean;

  /**
   * Start a tracer instance
   * @param config Configuration for tracer instace
   * @returns A tracer instance started
   */
  start(config: configTypes.TracerConfig): Tracer;

  /** Stop the tracer instance */
  stop(): Tracer;

  /**
   * Start a new RootSpan to currentRootSpan
   * @param options Options for tracer instance
   * @param fn Callback function
   * @returns The callback return
   */
  startRootSpan<T>(options: TraceOptions, fn: (root: RootSpan) => T): T;

  /**
   * Register a OnEndSpanEventListener on the tracer instance
   * @param listener An OnEndSpanEventListener instance
   */
  registerSpanEventListener(listener: SpanEventListener): void;

  /**
   * Unregisters an end span event listener.
   * @param listener The listener to unregister.
   */
  unregisterSpanEventListener(listener: SpanEventListener): void;

  /** Clear the currentRootSpan from tracer instance */
  clearCurrentTrace(): void;

  /**
   * Start a new Span instance to the currentRootSpan
   * @param name Span name
   * @param type Span type
   * @param parentSpanId Parent SpanId
   * @returns The new Span instance started
   */
  startChildSpan(name?: string, type?: string, parentSpanId?: string): Span;

  /**
   * Binds the trace context to the given function.
   * This is necessary in order to create child spans correctly in functions
   * that are called asynchronously (for example, in a network response
   * handler).
   * @param fn A function to which to bind the trace context.
   */
  wrap<T>(fn: Func<T>): Func<T>;

  /**
   * Binds the trace context to the given event emitter.
   * This is necessary in order to create child spans correctly in event
   * handlers.
   * @param emitter An event emitter whose handlers should have
   * the trace context binded to them.
   */
  wrapEmitter(emitter: NodeJS.EventEmitter): void;
}
