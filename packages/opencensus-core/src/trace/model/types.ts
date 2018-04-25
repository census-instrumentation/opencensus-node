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

import * as configTypes from '../config/types';
import * as samplerTypes from '../sampler/types';
import * as loggerTypes from '../../common/types';


/** Default type for functions */
// tslint:disable:no-any
export type Func<T> = (...args: any[]) => T;

/** Maps a label to a string, number or boolean. */
export interface Attributes { [attributeKey: string]: string|number|boolean; }

/** A text annotation with a set of attributes. */
export interface Annotation {
  /** A user-supplied message describing the event. */
  description: string;
  /** A timestamp that maks the event. */
  timestamp: number;
  /** A set of attributes on the annotation. */
  attributes: Attributes;
}

/** An event describing a message sent/received between Spans. */
export interface MessageEvent {
  /** Indicates whether the message was sent or received. */
  type: string;
  /** An identifier for the MessageEvent's message. */
  id: string;
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
  traceContext?: TraceContext;
  /** Span type */
  type?: string;
}

/** Defines the trace context */
export interface TraceContext {
  /** Trace ID */
  traceId: string;
  /** Span ID */
  spanId: string;
  /** Options */
  options?: number;
  /** Sample decision */
  sampleDecision?: boolean;
}

/** Defines an end span event listener */
export interface OnEndSpanEventListener {
  /** Happens when a span is ended */
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

  /** Type of span. Used to specify additional relationships between spans */
  type: string;

  /** An object to log information to */
  logger: loggerTypes.Logger;

  /** A final status for this span */
  status: number;

  /** A set of attributes, each in the format [KEY]:[VALUE] */
  attributes: Attributes;

  /** A text annotation with a set of attributes. */
  annotations: Annotation[];

  /** An event describing a message sent/received between Spans. */
  messageEvents: MessageEvent[];

  /** Pointers from the current span to another span */
  links: Link[];

  /** Constructs a new SpanBaseModel instance. */
  readonly traceId: string;

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
  readonly traceContext: TraceContext;

  /**
   * Adds an atribute to the span.
   * @param key Describes the value added.
   * @param value The result of an operation.
   */
  addAttribute(key: string, value: string): void;

  /**
   * Adds an annotation to the span.
   * @param description Describes the event.
   * @param timestamp A timestamp that maks the event.
   * @param attributes A set of attributes on the annotation.
   */
  addAnnotation(
      description: string, timestamp: number, attributes?: Attributes): void;

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
   */
  addMessageEvent(type: string, id: string): void;

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

  /** Starts the RootSpan instance */
  start(): void;

  /** Ends the RootSpan instance */
  end(): void;

  /** Starts a new Span instance in the RootSpan instance */
  startSpan(name: string, type: string, parentSpanId?: string): Span;
}


/** Interface for Tracer */
export interface Tracer extends OnEndSpanEventListener {
  /** Get and set the currentRootSpan to tracer instance */
  currentRootSpan: RootSpan;

  /** A sampler that will decide if the span will be sampled or not */
  sampler: samplerTypes.Sampler;

  /** A configuration for starting the tracer */
  logger: loggerTypes.Logger;

  /** Get the eventListeners from tracer instance */
  readonly eventListeners: OnEndSpanEventListener[];

  /** Get the active status from tracer instance */
  readonly active: boolean;

  /**
   * Start a tracer instance
   * @param config Configuration for tracer instace
   * @returns A tracer instance started
   */
  start(config: configTypes.TracerConfig): Tracer;

  /** Stop the tracer instance */
  stop(): void;

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
  registerEndSpanListener(listener: OnEndSpanEventListener): void;

  /** Clear the currentRootSpan from tracer instance */
  clearCurrentTrace(): void;

  /**
   * Start a new Span instance to the currentRootSpan
   * @param name Span name
   * @param type Span type
   * @param parentSpanId Parent SpanId
   * @returns The new Span instance started
   */
  startSpan(name?: string, type?: string, parentSpanId?: string): Span;

  /**
   * Wraper to contextManager
   * @param fn Function that will wrap in contextManager
   * @returns The contextManager class wrapped
   */
  wrap<T>(fn: Func<T>): Func<T>;

  /**
   * Wrapper to contextManager emitter
   * @param emitter Function that will wrap in contextManager emitter
   * @returns The contextManager emitter wrapped
   */
  wrapEmitter(emitter: NodeJS.EventEmitter): void;
}