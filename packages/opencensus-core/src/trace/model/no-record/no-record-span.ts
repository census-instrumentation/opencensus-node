/**
 * Copyright 2019, OpenCensus Authors
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
import { noopLogger } from '../../../common/noop-logger';
import { Logger } from '../../../common/types';
import { randomSpanId } from '../../../internal/util';
import * as configTypes from '../../config/types';
import * as types from '../types';

const STATUS_OK = {
  code: types.CanonicalCode.OK,
};

/** Implementation for the SpanBase class that does not record trace events. */
export class NoRecordSpan implements types.Span {
  /** Indicates if this span was started */
  private startedLocal = false;
  /** Indicates if this span was ended */
  private endedLocal = false;
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
  root: NoRecordSpan;
  /** This span's parent. If it's a root span, must be empty */
  parentSpan?: NoRecordSpan;
  /** The resource name of the span */
  name = 'no-record';
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

  /** Constructs a new SpanBaseModel instance. */
  constructor(tracer: types.TracerBase, parent?: NoRecordSpan) {
    this.tracer = tracer;
    this.id = randomSpanId();
    if (parent) {
      this.root = parent.root;
      this.parentSpan = parent;
    } else {
      this.root = this;
    }
    this.logger = (this.root && this.root.logger) || this.logger;
  }

  /** Returns whether a span is root or not. */
  isRootSpan(): boolean {
    return false;
  }

  /** Gets trace id of no-record span. */
  get traceId(): string {
    return '';
  }

  /** Gets the trace state */
  get traceState(): types.TraceState | undefined {
    return undefined;
  }

  /** Gets the ID of the parent span. */
  get parentSpanId(): string {
    if (!this.parentSpan) {
      return '';
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

  /** No-op implementation of this method. */
  get startTime(): Date {
    return new Date();
  }

  /** No-op implementation of this method. */
  allDescendants(): types.Span[] {
    return [];
  }

  /** No-op implementation of this method. */
  get spans(): types.Span[] {
    return [];
  }

  /** No-op implementation of this method. */
  get numberOfChildren(): number {
    return 0;
  }

  /** No-op implementation of this method. */
  get endTime(): Date {
    return new Date();
  }

  /** Gives the TraceContext of the span. */
  get spanContext(): types.SpanContext {
    return {
      traceId: this.traceId,
      spanId: this.id,
      options: 0,
      traceState: this.traceState,
    };
  }

  /** No-op implementation of this method. */
  get duration(): number {
    return 0;
  }

  /** No-op implementation of this method. */
  addAttribute(key: string, value: string | number | boolean | object) {}

  /** No-op implementation of this method. */
  addAnnotation(
    description: string,
    attributes?: types.Attributes,
    timestamp = 0
  ) {}

  /** No-op implementation of this method. */
  addLink(
    traceId: string,
    spanId: string,
    type: types.LinkType,
    attributes?: types.Attributes
  ) {}

  /** No-op implementation of this method. */
  addMessageEvent(
    type: types.MessageEventType,
    id: number,
    timestamp = 0,
    uncompressedSize?: number,
    compressedSize?: number
  ) {}

  /** No-op implementation of this method. */
  setStatus(code: types.CanonicalCode, message?: string) {}

  /** No-op implementation of this method. */
  start() {
    this.startedLocal = true;
  }

  /** No-op implementation of this method. */
  end(): void {
    this.startedLocal = false;
    this.endedLocal = true;
  }

  /** No-op implementation of this method. */
  truncate() {}

  /**
   * Starts a new no record child span in the no record root span.
   * @param [options] A SpanOptions object to start a child span.
   */
  startChildSpan(options?: types.SpanOptions): types.Span {
    const noRecordChild = new NoRecordSpan(this.tracer, this);
    if (options && options.name) noRecordChild.name = options.name;
    if (options && options.kind) noRecordChild.kind = options.kind;
    noRecordChild.start();
    return noRecordChild;
  }
}
