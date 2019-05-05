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

import * as cls from '../../internal/cls';

import {NoRecordSpan} from './no-record/no-record-span';
import {CoreTracerBase} from './tracer-base';
import * as types from './types';

/**
 * This class represents a tracer with Continuation Local Storage (CLS).
 *
 * CLS helps keep tracking the root span over function calls automatically.
 * It is capable of storing, propagating and retrieving arbitrary
 * continuation-local data (also called "context").
 * CLS comes with some performance overhead, you can read more about it here:
 * https://github.com/othiym23/node-continuation-local-storage/issues/59
 */
export class CoreTracer extends CoreTracerBase implements types.Tracer {
  /** Manage context automatic propagation */
  private contextManager: cls.Namespace;

  /** Constructs a new TraceImpl instance. */
  constructor() {
    super();
    this.contextManager = cls.getNamespace();
    this.clearCurrentTrace();
  }

  /** Gets the current root span. */
  get currentRootSpan(): types.Span {
    return this.contextManager.get('rootspan');
  }

  /** Sets the current root span. */
  set currentRootSpan(root: types.Span) {
    if (this.contextManager.active) {
      this.contextManager.set('rootspan', root);
    }
  }
  /**
   * Sets span to CLS
   * @param span Span to setup in context.
   * @param fn A callback function that runs after context setup.
   */
  withSpan<T>(span: types.Span, fn: () => T): T {
    const self = this;
    return self.contextManager.runAndReturn(() => {
      self.currentRootSpan = span;
      return fn();
    });
  }
  /**
   * Starts a root span and sets it to context.
   * @param options A TraceOptions object to start a root span.
   * @returns {Span} A new root span.
   */
  startWithRootSpan<T>(
      options: types.TraceOptions, fn: (root: types.Span) => T): T {
    const rootSpan = this.startRootSpan(options);
    return this.withSpan(rootSpan, () => {
      return fn(rootSpan);
    });
  }

  /** Clears the current root span. */
  clearCurrentTrace() {
    // TODO: Remove null reference and ts-ignore check.
    //@ts-ignore
    this.currentRootSpan = null;
  }

  /**
   * Starts a span.
   * @param [options] A SpanOptions object to start a child span.
   */
  startChildSpan(options?: types.SpanOptions): types.Span {
    if (!this.currentRootSpan) {
      this.logger.debug(
          'no current trace found - must start a new root span first');
    }

    return super.startChildSpan(Object.assign(
        {
          childOf: (options && options.childOf) || this.currentRootSpan ||
              new NoRecordSpan()
        },
        options));
  }

  /**
   * Binds the trace context to the given function.
   * This is necessary in order to create child spans correctly in functions
   * that are called asynchronously (for example, in a network response
   * handler).
   * @param fn A function to which to bind the trace context.
   */
  wrap<T>(fn: types.Func<T>): types.Func<T> {
    if (!this.active) {
      return fn;
    }
    const namespace = this.contextManager;
    return namespace.bind<T>(fn);
  }

  /**
   * Binds the trace context to the given event emitter.
   * This is necessary in order to create child spans correctly in event
   * handlers.
   * @param emitter An event emitter whose handlers should have
   *     the trace context binded to them.
   */
  wrapEmitter(emitter: NodeJS.EventEmitter): void {
    if (!this.active) {
      return;
    }
    const namespace = this.contextManager;
    namespace.bindEmitter(emitter);
  }
}
