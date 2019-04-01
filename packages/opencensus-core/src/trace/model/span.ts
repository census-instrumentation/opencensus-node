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

import * as logger from '../../common/console-logger';
import {SpanBase} from './span-base';
import * as types from './types';

/** Defines a Span. */
export class Span extends SpanBase implements types.Span {
  private root: types.RootSpan;
  /** set isRootSpan = true */
  readonly isRootSpan = false;

  /**
   * Constructs a new SpanImpl instance.
   * @param root
   */
  constructor(root: types.RootSpan) {
    super();
    this.root = root;
    this.logger = this.root.logger || logger.logger();
    this.parentSpanId = root.id;
    this.activeTraceParams = this.root.activeTraceParams;
  }

  /** Gets trace id of span. */
  get traceId(): string {
    return this.root.traceId;
  }

  get traceState(): types.TraceState|undefined {
    return this.root.traceState;
  }

  /** Starts the span instance. */
  start() {
    super.start();
    this.logger.debug('starting span  %o', {
      traceId: this.traceId,
      spanId: this.id,
      name: this.name,
      traceState: this.traceState
    });
  }


  /** Ends the span. */
  end(): void {
    super.end();
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
