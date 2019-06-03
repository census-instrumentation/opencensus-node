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
import * as core from '@opencensus/core';
import { DEFAULT_INSTRUMENTATION_MODULES } from '@opencensus/instrumentation-all';
import { TracingBase } from '@opencensus/nodejs-base';

/** Implements a Tracing with Continuation Local Storage (CLS). */
export class Tracing extends TracingBase {
  /** A tracer object */
  readonly tracer: core.Tracer;

  /** Constructs a new TracingImpl instance. */
  constructor() {
    /** Default list of target modules to be instrumented */
    super(DEFAULT_INSTRUMENTATION_MODULES);
    this.tracer = new core.CoreTracer();
  }
}
