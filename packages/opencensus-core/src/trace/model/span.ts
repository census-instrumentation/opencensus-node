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
import { noopLogger } from '../../common/noop-logger';
import { Logger } from '../../common/types';
import { Clock } from '../../internal/clock';
import { randomSpanId } from '../../internal/util';
import * as configTypes from '../config/types';

import { NoRecordSpan } from './no-record/no-record-span';
import * as types from './types';

const STATUS_OK = {
  code: types.CanonicalCode.OK,
};

/** Defines a base model for spans. */
export class Span implements types.Span {
  protected className: string;
  /** The clock used to mesure the beginning and ending of a span */
  private clock!: Clock;
  /** Indicates if this span was started */
  private startedLocal = false;
  /** Indicates if this span was ended */
  private endedLocal = false;
  /** A list of child spans which are immediate, local children of this span */
  private spansLocal: types.Span[];
  /** The Span ID of this span */
  readonly id: string;
  /** A tracer object */
  readonly tracer: types.TracerBase;
  /** An object to log information to */
  logger: Logger = noopLogger;
  /** A set of attributes, each in the format [KEY]:[VALUE] */
  attributes: types.Attributes = {};
  /** A text annotation with a set of attributes. */
  annotations: types.Annotation[] = [];
  /** An event describing a message sent/received between Spans */
  messageEvents: types.MessageEvent[] = [];
  /** Pointers from the current span to another span */
  links: types.Link[] = [];
  /** If the parent span is in another process. */
  remoteParent = false;
  /** This span's root span.  If it's a root span, it will point to this */
  root: Span;
  /** This span's parent. If it's a root span, must be empty */
  parentSpan?: Span;
  /** The resource name of the span */
  name = 'span';
  /** Kind of span. */
  kind: types.SpanKind = types.SpanKind.UNSPECIFIED;
  /** A final status for this span */
  status: types.Status = STATUS_OK;
  /** Trace Parameters */
  activeTraceParams: configTypes.TraceParams = {};

  /** The number of dropped attributes. */
  droppedAttributesCount = 0;
  /** The number of dropped links. */
  droppedLinksCount = 0;
  /** The number of dropped annotations. */
  droppedAnnotationsCount = 0;
  /** The number of dropped message events. */
  droppedMessageEventsCount = 0;

  /** Constructs a new Span instance. */
  constructor(tracer: types.TracerBase, parent?: Span) {
    this.tracer = tracer;
    this.className = this.constructor.name;
    this.id = randomSpanId();
    this.spansLocal = [];
    if (parent) {
      this.root = parent.root;
      this.parentSpan = parent;
      this.activeTraceParams = this.root.activeTraceParams;
    } else {
      this.root = this;
    }
    this.logger = (this.root && this.root.logger) || this.logger;
  }

  /** Returns whether a span is root or not. */
  isRootSpan(): boolean {
    return false;
  }

  /** Gets the trace ID. */
  get traceId(): string {
    return this.root.traceId;
  }

  /** Gets the trace state */
  get traceState(): types.TraceState | undefined {
    return this.root.traceState;
  }

  /**
   * Gets the ID of the parent span.
   * RootSpan doesn't have a parentSpan but it override this method.
   */
  get parentSpanId(): string {
    if (!this.parentSpan) {
      return 'no-parent';
    }
    return this.parentSpan.id;
  }

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
      return new Date();
    }

    return this.clock.startTime;
  }

  /** Recursively gets the descendant spans. */
  allDescendants(): types.Span[] {
    return this.spansLocal.reduce((acc: types.Span[], cur) => {
      acc.push(cur);
      const desc = cur.allDescendants();
      acc = acc.concat(desc);
      return acc;
    }, []);
  }

  /** The list of immediate child spans. */
  get spans(): types.Span[] {
    return this.spansLocal;
  }

  /** The number of direct children. */
  get numberOfChildren(): number {
    return this.spansLocal.length;
  }

  /**
   * Gives a timestamp that indicates the span's end time in RFC3339 UTC
   * "Zulu" format.
   */
  get endTime(): Date {
    if (!this.clock) {
      this.logger.debug('calling endTime() on null clock');
      return new Date();
    }

    return this.clock.endTime;
  }

  /**
   * Gets the duration of the clock.
   */
  get duration(): number {
    if (!this.clock) {
      this.logger.debug('calling duration() on null clock');
      return 0;
    }

    return this.clock.duration;
  }

  /** Gives the TraceContext of the span. */
  get spanContext(): types.SpanContext {
    return {
      traceId: this.traceId,
      spanId: this.id,
      options: 0x1, // always traced
      traceState: this.traceState,
    };
  }

  /**
   * Adds an atribute to the span.
   * @param key Describes the value added.
   * @param value The result of an operation. If the value is a typeof object
   *     it has to be JSON.stringify-able, cannot contain circular dependencies.
   */
  addAttribute(key: string, value: string | number | boolean | object) {
    if (this.attributes[key]) {
      delete this.attributes[key];
    }

    if (
      Object.keys(this.attributes).length >=
      this.activeTraceParams.numberOfAttributesPerSpan!
    ) {
      this.droppedAttributesCount++;
      const attributeKeyToDelete = Object.keys(this.attributes).shift();
      if (attributeKeyToDelete) {
        delete this.attributes[attributeKeyToDelete];
      }
    }
    const serializedValue =
      typeof value === 'object' ? JSON.stringify(value) : value;
    this.attributes[key] = serializedValue;
  }

  /**
   * Adds an annotation to the span.
   * @param description Describes the event.
   * @param attributes A set of attributes on the annotation.
   * @param timestamp A time, in milliseconds. Defaults to Date.now()
   */
  addAnnotation(
    description: string,
    attributes: types.Attributes = {},
    timestamp = Date.now()
  ) {
    if (
      this.annotations.length >=
      this.activeTraceParams.numberOfAnnontationEventsPerSpan!
    ) {
      this.annotations.shift();
      this.droppedAnnotationsCount++;
    }
    this.annotations.push({ description, attributes, timestamp });
  }

  /**
   * Adds a link to the span.
   * @param traceId The trace ID for a trace within a project.
   * @param spanId The span ID for a span within a trace.
   * @param type The relationship of the current span relative to the linked.
   * @param attributes A set of attributes on the link.
   */
  addLink(
    traceId: string,
    spanId: string,
    type: types.LinkType,
    attributes: types.Attributes = {}
  ) {
    if (this.links.length >= this.activeTraceParams.numberOfLinksPerSpan!) {
      this.links.shift();
      this.droppedLinksCount++;
    }

    this.links.push({ traceId, spanId, type, attributes });
  }

  /**
   * Adds a message event to the span.
   * @param type The type of message event.
   * @param id An identifier for the message event.
   * @param timestamp A time in milliseconds. Defaults to Date.now()
   * @param uncompressedSize The number of uncompressed bytes sent or received
   * @param compressedSize The number of compressed bytes sent or received. If
   *     zero or undefined, assumed to be the same size as uncompressed.
   */
  addMessageEvent(
    type: types.MessageEventType,
    id: number,
    timestamp = Date.now(),
    uncompressedSize?: number,
    compressedSize?: number
  ) {
    if (
      this.messageEvents.length >=
      this.activeTraceParams.numberOfMessageEventsPerSpan!
    ) {
      this.messageEvents.shift();
      this.droppedMessageEventsCount++;
    }

    this.messageEvents.push({
      type,
      id,
      timestamp,
      uncompressedSize,
      compressedSize,
    });
  }

  /**
   * Sets a status to the span.
   * @param code The canonical status code.
   * @param message optional A developer-facing error message.
   */
  setStatus(code: types.CanonicalCode, message?: string) {
    this.status = { code, message };
  }

  /** Starts the span. */
  start() {
    if (this.started) {
      this.logger.debug(
        'calling %s.start() on already started %s %o',
        this.className,
        this.className,
        { id: this.id, name: this.name, type: this.kind }
      );
      return;
    }
    // start child span's clock from root's current time to preserve integrity.
    if (this.parentSpan) {
      this.clock = new Clock(this.parentSpan.clock.currentDate);
    } else {
      this.clock = new Clock();
    }
    this.startedLocal = true;
    this.logger.debug('starting %s  %o', this.className, {
      traceId: this.traceId,
      id: this.id,
      name: this.name,
      parentSpanId: this.parentSpanId,
      traceState: this.traceState,
    });

    if (this.isRootSpan()) this.tracer.setCurrentRootSpan(this);
    this.tracer.onStartSpan(this);
  }

  /** Ends the span and all of its children, recursively. */
  end(): void {
    if (this.ended) {
      this.logger.debug(
        'calling %s.end() on already ended %s %o',
        this.className,
        this.className,
        { id: this.id, name: this.name, type: this.kind }
      );
      return;
    }
    if (!this.started) {
      this.logger.error(
        'calling %s.end() on un-started %s %o',
        this.className,
        this.className,
        { id: this.id, name: this.name, type: this.kind }
      );
      return;
    }
    this.startedLocal = false;
    this.endedLocal = true;
    this.clock.end();

    // TODO: Should ending a span force its children to end by default?
    // Issue: https://github.com/open-telemetry/opentelemetry-node/issues/4
    for (const span of this.spansLocal) {
      if (!span.ended && span.started) {
        span.truncate();
      }
    }

    this.tracer.onEndSpan(this);
  }

  /** Forces the span to end. */
  truncate() {
    this.end();
    this.logger.debug('truncating %s  %o', this.className, {
      id: this.id,
      name: this.name,
    });
  }

  /**
   * Starts a new child span.
   * @param [options] A SpanOptions object to start a child span.
   */
  startChildSpan(options?: types.SpanOptions): types.Span {
    if (this.ended) {
      this.logger.debug(
        'calling %s.startSpan() on ended %s %o',
        this.className,
        this.className,
        { id: this.id, name: this.name, kind: this.kind }
      );
      return new NoRecordSpan(this.tracer);
    }
    if (!this.started) {
      this.logger.debug(
        'calling %s.startSpan() on un-started %s %o',
        this.className,
        this.className,
        { id: this.id, name: this.name, kind: this.kind }
      );
      return new NoRecordSpan(this.tracer);
    }

    const child = new Span(this.tracer, this);
    if (options && options.name) child.name = options.name;
    if (options && options.kind) child.kind = options.kind;

    child.start();
    this.spansLocal.push(child);
    return child;
  }
}
