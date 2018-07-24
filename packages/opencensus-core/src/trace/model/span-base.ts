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
import {Logger} from '../../common/types';
import {Clock} from '../../internal/clock';
import {randomSpanId} from '../../internal/util';

import * as types from './types';


/** Defines a base model for spans. */
export abstract class SpanBase implements types.Span {
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
  /** An object to log information to */
  logger: Logger;
  /** A set of attributes, each in the format [KEY]:[VALUE] */
  attributes: types.Attributes = {};
  /** A text annotation with a set of attributes. */
  annotations: types.Annotation[] = [];
  /** An event describing a message sent/received between Spans */
  messageEvents: types.MessageEvent[] = [];
  /** Pointers from the current span to another span */
  links: types.Link[] = [];
  /** If the parent span is in another process. */
  remoteParent: boolean;
  /** The span ID of this span's parent. If it's a root span, must be empty */
  parentSpanId: string = null;
  /** The resource name of the span */
  name: string = null;
  /** Kind of span. */
  kind: string = null;
  /** A final status for this span */
  status: number;
  /** set isRootSpan  */
  abstract get isRootSpan(): boolean;

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
   * Gives a timestamp that indicates the span's start time in RFC3339 UTC
   * "Zulu" format.
   */
  get startTime(): Date {
    if (!this.clock) {
      this.logger.debug('calling startTime() on null clock');
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
      this.logger.debug('calling endTime() on null clock');
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
      this.logger.debug('calling duration() on null clock');
      return null;
    }

    return this.clock.duration;
  }

  /** Gives the TraceContext of the span. */
  get spanContext(): types.SpanContext {
    return {
      traceId: this.traceId,
      spanId: this.id,
      options: 0x1  // always traced
    };
  }

  /**
   * Adds an atribute to the span.
   * @param key Describes the value added.
   * @param value The result of an operation.
   */
  addAttribute(key: string, value: string|number|boolean) {
    this.attributes[key] = value;
  }

  /**
   * Adds an annotation to the span.
   * @param description Describes the event.
   * @param attributes A set of attributes on the annotation.
   * @param timestamp A time, in milliseconds. Defaults to Date.now()
   */
  addAnnotation(
      description: string, attributes?: types.Attributes, timestamp = 0) {
    this.annotations.push({
      'description': description,
      'attributes': attributes,
      'timestamp': timestamp ? timestamp : Date.now(),
    } as types.Annotation);
  }

  /**
   * Adds a link to the span.
   * @param traceId The trace ID for a trace within a project.
   * @param spanId The span ID for a span within a trace.
   * @param type The relationship of the current span relative to the linked.
   * @param attributes A set of attributes on the link.
   */
  addLink(
      traceId: string, spanId: string, type: string,
      attributes?: types.Attributes) {
    this.links.push({
      'traceId': traceId,
      'spanId': spanId,
      'type': type,
      'attributes': attributes
    } as types.Link);
  }

  /**
   * Adds a message event to the span.
   * @param type The type of message event.
   * @param id An identifier for the message event.
   * @param timestamp A time in milliseconds. Defaults to Date.now()
   */
  addMessageEvent(type: string, id: string, timestamp = 0) {
    this.messageEvents.push({
      'type': type,
      'id': id,
      'timestamp': timestamp ? timestamp : Date.now(),
    } as types.MessageEvent);
  }

  /** Starts the span. */
  start() {
    if (this.started) {
      this.logger.debug(
          'calling %s.start() on already started %s %o', this.className,
          this.className, {id: this.id, name: this.name, type: this.kind});
      return;
    }
    this.clock = new Clock();
    this.startedLocal = true;
  }

  /** Ends the span. */
  end(): void {
    if (this.ended) {
      this.logger.debug(
          'calling %s.end() on already ended %s %o', this.className,
          this.className, {id: this.id, name: this.name, type: this.kind});
      return;
    }
    if (!this.started) {
      this.logger.error(
          'calling %s.end() on un-started %s %o', this.className,
          this.className, {id: this.id, name: this.name, type: this.kind});
      return;
    }
    this.startedLocal = false;
    this.endedLocal = true;
    this.clock.end();
  }


  /** Forces the span to end. */
  truncate() {
    this.truncated = true;
    this.end();
    this.logger.debug(
        'truncating %s  %o', this.className, {id: this.id, name: this.name});
  }
}
