/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import { Sampler } from './config/sampler';
import { SpanBaseModel } from './model/spanbasemodel';

/** Default type for functions */
export type Func<T> = (...args: any[]) => T;

/** Maps a label to a string. Used in spans' attributes. */
export interface MapLabels { [propName: string]: string; }

/** Maps a label to a string, number or boolean. Used in spans' annotations. */
export interface MapObjects { [propName: string]: string|number|boolean; }

/** Defines tracer configuration parameters */
export interface TracerConfig {
  /** Determines the samplin rate. Ranges from 0.0 to 1.0 */
  sampleRate?: number;
  /** Determines the ignored (or blacklisted) URLs */
  ignoreUrls?: Array<string|RegExp>;
}

/** Defines a default tracer configuration */
export const defaultConfig: TracerConfig = {
  sampleRate: 1.0
};

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

/** Defines the trace options */
export interface TraceOptions {
  /** Root span name */
  name: string;
  /** Trace context */
  traceContext?: TraceContext;
  /** Sampler */
  sampler?: Sampler;
  /** Span type */
  type?: string;
}

/** Defines an end span event listener */
export interface OnEndSpanEventListener {
  /** Happens when a span is ended */
  onEndSpan(span: SpanBaseModel): void;
}

/** Defines the span data */
export interface SpanData {
  /** A collection of labels associated with the span */
  labels: {[key: string]: string};
  /** The resource name of the span */
  name: string;
  /** The Span ID of this span */
  spanId: string;
  /** The span ID of this span's parent. If it's a root span, must be empty. */
  parentSpanId?: string;
}

/** Interface for RootSpan */
export interface RootSpan {
    /** Get the span list from RootSpan instance */
    readonly spans: Span[];

    /** Start the RootSpan instance */
    start(): void;
    /** End the RootSpan instance */
    end(): void;
    /** Start a new Span instance in the RootSpan instance */
    startSpan(name: string, type: string, parentSpanId?: string): Span;
}

/** Interface for Span */
export interface Span {
    /** Gets the traceId from span instance */
    readonly traceId: string;
    /** Gets the parentSpanId from span instance */
    readonly parentSpanId: string;
    /** Gets the traceContext from span instance */
    readonly traceContext: TraceContext;

    /** Starts a span instance. */
    start(): void;
    /** Ends a span. */
    end(): void;
}

/** Interface for Tracer */
export interface Tracer {
    /** Get and set the currentRootSpan to tracer instance */
    currentRootSpan: RootSpan;
    /** Get the eventListeners from tracer instance */
    readonly eventListeners: OnEndSpanEventListener[];
    /** Get the active status from tracer instance */
    readonly active: boolean;

    /**
     * Start a tracer instance
     * @param config Configuration for tracer instace
     * @returns A tracer instance started
     */
    start(config?: TracerConfig): Tracer;   
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
     * Event called on the span end
     * @param root The RootSpan that was ended
     */
    onEndSpan(root: RootSpan): void;
    /**
     * Register a OnEndSpanEventListener on the tracer instance
     * @param listner An OnEndSpanEventListener instance
     */
    registerEndSpanListener(listner: OnEndSpanEventListener): void;
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
     * Monkeypatch to contextManager
     * @param fn Function that will wrap in contextManager
     * @returns The contextManager class wrapped
     */
    wrap<T>(fn: Func<T>): Func<T>;
    /**
     * Monkeypatch to contextManager emitter
     * @param emitter Function that will wrap in contextManager emitter
     * @returns The contextManager emitter wrapped
     */
    wrapEmitter(emitter: NodeJS.EventEmitter): void;
}