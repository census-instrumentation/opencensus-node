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

import {debug, randomSpanId} from '../../internal/util';

import {RootSpan} from './root-span';
import {SpanBaseModel} from './span-base-model';

import * as logger from '../../common/console-logger';
import * as types from './types';

/** Defines a Span. */
export class Span extends SpanBaseModel implements types.Span {
  private root: RootSpan;

  /**
   * Constructs a new SpanImpl instance.
   * @param root
   */
  constructor(root: RootSpan) {
    super();
    this.root = root;
    this.logger = this.root.logger || logger.logger();
  }

  /** Gets trace id of span. */
  get traceId(): string {
    return this.root.traceId;
  }

  /** Gets trace context of span. */
  get traceContext(): types.TraceContext {
    return {
      traceId: this.traceId.toString(),
      spanId: this.id.toString(),
      options: 1  // always traced
    };
  }

  /** Starts the span instance. */
  start() {
    super.start();
    this.logger.debug(
        'starting span  %o',
        {traceId: this.traceId, spanId: this.id, name: this.name});
  }

  /** Notifies an end operation on span instance. */
  private notifyEnd() {
    this.root.onEndSpan(this);
  }

  /** Ends the span. */
  end(): void {
    super.end();
    this.notifyEnd();
    this.logger.debug('ending span  %o', {
      spanId: this.id,
      traceId: this.traceId,
      name: this.name,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration
    });
  }
}
