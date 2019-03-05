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
import {NoopSpanBase} from './noop-span-base';

/** No-Op implementation of the Span */
export class NoopSpan extends NoopSpanBase implements types.Span {
  private root: types.RootSpan;
  /** set isRootSpan = false */
  readonly isRootSpan = false;

  /**
   * Constructs a new NoopSpanImpl instance.
   * @param root
   */
  constructor(root: types.RootSpan) {
    super();
    this.root = root;
    this.logger = this.root.logger || logger.logger();
    this.parentSpanId = root.id;
  }

  /** Gets trace id of noop span. */
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
