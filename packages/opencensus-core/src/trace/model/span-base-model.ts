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

import { Clock } from '../../internal/clock';
import { debug, randomSpanId } from '../../internal/util';
import { Sampler } from '../config/types';
import { TraceContext, Span, Annotation, Attributes,
    Link, MessageEvent } from './types';

/** Defines a base model for spans. */
export abstract class SpanBaseModel implements Span {
    protected className: string;
    /** The clock used to mesure the beginning and ending of a span */
    private clock: Clock = null;
    /** Indicates if this span was started */
    private startedLocal = false;
    /** Indicates if this span was ended */
    private endedLocal = false;
    /** Indicates if this span was forced to end */
    private truncated = false;
    /** The Span ID of this span */
    readonly id: string;
    /** A set of attributes, each in the format [KEY]:[VALUE] */
    attributes: Attributes = {};
    /** A text annotation with a set of attributes. */
    annotations: Annotation[] = [];
    /** An event describing a message sent/received between Spans */
    messageEvents: MessageEvent[] = [];
    /** Pointers from the current span to another span */
    links: Link[] = [];
    /** If the parent span is in another process. */
    remoteParent: boolean;
    /** The span ID of this span's parent. If it's a root span, must be empty */
    parentSpanId: string = null;
    /** The resource name of the span */
    name: string = null;
    /** Type of span. Used to specify additional relationships between spans */
    type: string = null;
    /** A final status for this span */
    status: number;
  
    /** Constructs a new SpanBaseModel instance. */
    constructor() {
      this.className = this.constructor.name;
      this.id = randomSpanId();
    }
  
    /** Gets the trace ID. */
    abstract get traceId(): string;

    /** Indicates if span was started. */
    get started(): boolean {
      return this.startedLocal;
    }
  
    /** Indicates if span was ended. */
    get ended(): boolean {
      return this.endedLocal;
    }
  
    /**
     * Gives a timestap that indicates the span's start time in RFC3339 UTC
     * "Zulu" format.
     */
    get startTime(): Date {
      if (!this.clock) {
        debug("calling startTime() on null clock");
        return null;
      }
      
      return this.clock.startTime;
    }
  
    /**
     * Gives a timestap that indicates the span's end time in RFC3339 UTC
     * "Zulu" format.
     */
    get endTime(): Date {
      if (!this.clock) {
        debug("calling endTime() on null clock");
        return null;
      }

      return this.clock.endTime;
    }
  
    /**
     * Gives a timestap that indicates the span's duration in RFC3339 UTC
     * "Zulu" format.
     */
    get duration(): number {
      if (!this.clock) {
        debug("calling duration() on null clock");
        return null;
      }

      return this.clock.duration;
    }
  
    /** Gives the TraceContext of the span. */
    get traceContext(): TraceContext {
      return {
        traceId: this.traceId.toString(),
        spanId: this.id.toString(),
        parentSpanId: this.parentSpanId
      } as TraceContext;
    }
  
    /**
     * Adds an atribute to the span.
     * @param key Describes the value added.
     * @param value The result of an operation.
     */
    addAtribute(key: string, value: string | number | boolean) {
      this.attributes[key] = value;
    }
  
    /**
     * Adds an annotation to the span.
     * @param description Describes the event.
     * @param timestamp A timestamp that maks the event.
     * @param attributes A set of attributes on the annotation.
     */
    addAnnotation(description: string, timestamp: number,
        attributes?: Attributes) {
      this.annotations.push({
        'description': description,
        'timestamp': timestamp,
        'attributes': attributes,
      } as Annotation);
    }

    /**
     * Adds a link to the span.
     * @param traceId The trace ID for a trace within a project.
     * @param spanId The span ID for a span within a trace.
     * @param type The relationship of the current span relative to the linked.
     * @param attributes A set of attributes on the link.
     */
    addLink(traceId: string, spanId: string, type: string,
        attributes?: Attributes) {
      this.links.push({
        'traceId': traceId,
        'spanId': spanId,
        'type': type,
        'attributes': attributes
      } as Link);
    }

    /**
     * Adds a message event to the span.
     * @param type The type of message event.
     * @param id An identifier for the message event.
     */
    addMessageEvent(type: string, id: string) {
      this.messageEvents.push({
        'type': type,
        'id': id,
      } as MessageEvent);
    }
  
    /** Starts the span. */
    start() {
      if (this.started) {
        debug(
            'calling %s.start() on already started %s %o', this.className,
            this.className, {id: this.id, name: this.name, type: this.type});
        return;
      }
      this.clock = new Clock();
      this.startedLocal = true;
    }
  
    /** Ends the span. */
    end(): void {
      if (!this.started) {
        debug(
            'calling %s.end() on un-started %s %o', this.className,
            this.className, {id: this.id, name: this.name, type: this.type});
        return;
      }
      if (this.ended) {
        debug(
            'calling %s.end() on already ended %s %o', this.className,
            this.className, {id: this.id, name: this.name, type: this.type});
        return;
      }
      this.startedLocal = false;
      this.endedLocal = true;
      this.clock.end();
    }
  
  
    /** Forces the span to end. */
    truncate() {
      // TODO: review
      if (!this.started) {
        debug(
            'calling truncate non-started %s - ignoring %o', this.className,
            {id: this.id, name: this.name, type: this.type});
        return;
      } else if (this.ended) {
        debug(
            'calling truncate already ended %s - ignoring %o', this.className,
            {id: this.id, name: this.name, type: this.type});
        return;
      }
      this.truncated = true;
      this.end();
      debug('truncating %s  %o', this.className, {id: this.id, name: this.name});
    }
}