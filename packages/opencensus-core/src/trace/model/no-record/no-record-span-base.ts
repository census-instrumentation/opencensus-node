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

import {noopLogger} from '../../../common/noop-logger';
import {Logger} from '../../../common/types';
import {randomSpanId} from '../../../internal/util';
import * as configTypes from '../../config/types';
import * as types from '../types';

const STATUS_OK = {
  code: types.CanonicalCode.OK
};

/** Implementation for the SpanBase class that does not record trace events. */
export abstract class NoRecordSpanBase implements types.Span {
  /** Indicates if this span was started */
  private startedLocal = false;
  /** Indicates if this span was ended */
  private endedLocal = false;
  /** Indicates if this span was forced to end */
  // @ts-ignore
  private truncated = false;
  /** The Span ID of this span */
  readonly id: string;
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
  /** The span ID of this span's parent. If it's a root span, must be empty */
  parentSpanId = '';
  /** The resource name of the span */
  name = 'no-record';
  /** Kind of span. */
  kind: types.SpanKind = types.SpanKind.UNSPECIFIED;
  /** A final status for this span */
  status: types.Status = STATUS_OK;
  /** set isRootSpan  */
  abstract get isRootSpan(): boolean;
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
  constructor() {
    this.id = randomSpanId();
  }

  /** Gets the trace ID. */
  abstract get traceId(): string;

  /** Gets the trace state */
  abstract get traceState(): types.TraceState|undefined;

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
  get endTime(): Date {
    return new Date();
  }

  /** Gives the TraceContext of the span. */
  get spanContext(): types.SpanContext {
    return {
      traceId: this.traceId,
      spanId: this.id,
      options: 0,
      traceState: this.traceState
    };
  }

  /** No-op implementation of this method. */
  get duration(): number {
    return 0;
  }

  /** No-op implementation of this method. */
  addAttribute(key: string, value: string|number|boolean) {}

  /** No-op implementation of this method. */
  addAnnotation(
      description: string, attributes?: types.Attributes, timestamp = 0) {}

  /** No-op implementation of this method. */
  addLink(
      traceId: string, spanId: string, type: types.LinkType,
      attributes?: types.Attributes) {}

  /** No-op implementation of this method. */
  addMessageEvent(
      type: types.MessageEventType, id: string, timestamp = 0,
      uncompressedSize?: number, compressedSize?: number) {}

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
}
