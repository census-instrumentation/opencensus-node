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

import * as logger from '../../../common/console-logger';
import * as types from '../types';
import {NoRecordSpanBase} from './no-record-span-base';

/** Implementation for the Span class that does not record trace events. */
export class NoRecordSpan extends NoRecordSpanBase implements types.Span {
  private root: types.RootSpan;
  /** set isRootSpan = false */
  readonly isRootSpan = false;

  /**
   * Constructs a new NoRecordSpanImpl instance.
   * @param root
   */
  constructor(root: types.RootSpan) {
    super();
    this.root = root;
    this.logger = this.root.logger || logger.logger();
    this.parentSpanId = root.id;
  }

  /** Gets trace id of no-record span. */
  get traceId(): string {
    return this.root.traceId;
  }

  get traceState(): string {
    return this.root.traceState;
  }

  /** No-op implementation of this method. */
  start() {}

  /** No-op implementation of this method. */
  end() {}
}
