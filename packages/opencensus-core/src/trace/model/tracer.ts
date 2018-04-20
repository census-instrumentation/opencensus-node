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

import * as cls from '../../internal/cls';
import {debug} from '../../internal/util';
import {SamplerImpl} from '../config/sampler';
import {Sampler, TracerConfig} from '../config/types';
import {Config} from '../config/types';

import {RootSpanImpl} from './rootspan';
import {SpanImpl} from './span';
import {RootSpan, Span} from './types';
import {TraceOptions, Tracer} from './types';
import {Func, OnEndSpanEventListener} from './types';
import {Logger} from '../../common/types';

import * as logger from '../../common/consolelogger';

/**
 * This class represent a tracer.
 */
export class TracerImpl implements Tracer {
  /** Indicates if the tracer is active */
  private activeLocal: boolean;
  /** TODO */
  private contextManager: cls.Namespace;
  /** A configuration for starting the tracer */
  private config: TracerConfig;
  /** A list of end span event listeners */
  private eventListenersLocal: OnEndSpanEventListener[] = [];
  /** A list of ended root spans */
  private endedTraces: RootSpan[] = [];
  /** A sampler used to make sample decisions */
  sampler: Sampler;
  /** A configuration for starting the tracer */
  logger: Logger = logger();

  /** Constructs a new TraceImpl instance. */
  constructor() {
    this.activeLocal = false;
    this.contextManager = cls.createNamespace();
    this.clearCurrentTrace();
  }

  /** Gets the current root span. */
  get currentRootSpan(): RootSpan {
    return this.contextManager.get('rootspan');
  }

  /** Sets the current root span. */
  set currentRootSpan(root: RootSpan) {
    this.contextManager.set('rootspan', root);
  }

  /**
   * Starts a tracer.
   * @param config A tracer configuration object to start a tracer.
   */
  start(config: TracerConfig): Tracer {
    this.activeLocal = true;
    this.config = config;
    this.logger = this.config.logger || logger();
    this.sampler = new SamplerImpl().probability(config.samplingRate);
    return this;
  }

  /** Gets the list of event listners. */
  get eventListeners(): OnEndSpanEventListener[] {
    return this.eventListenersLocal;
  }

  /** Stops the tracer. */
  stop() {
    this.activeLocal = false;
  }

  /** Indicates if the tracer is active or not. */
  get active(): boolean {
    return this.activeLocal;
  }

  /**
   * Starts a root span.
   * @param options A TraceOptions object to start a root span.
   * @param fn A callback function to run after starting a root span.
   */
  startRootSpan<T>(options: TraceOptions, fn: (root: RootSpan) => T): T {
    return this.contextManager.runAndReturn((root) => {
      let newRoot = null;
      if (this.active) {
        newRoot = new RootSpanImpl(this, options);
        if (this.sampler.shouldSample(newRoot.traceId)) {
          newRoot.start();
          this.currentRootSpan = newRoot;
          return fn(newRoot);
        }
      } else {
        this.logger.debug('Tracer is inactive, can\'t start new RootSpan');
      }
      return fn(newRoot);
    });
  }

  /**
   * Is called when a span is ended.
   * @param root The ended span.
   */
  onEndSpan(root: RootSpan): void {
    if (!root) {
      return this.logger.debug('cannot end trace - no active trace found');
    }
    if (this.currentRootSpan !== root) {
      this.logger.debug('currentRootSpan != root on notifyEnd. Need more investigation.');
    }
    this.notifyEndSpan(root);
    // this.clearCurrentTrace();
  }

  /**
   * Registers an end span event listener.
   * @param listener The listener to register.
   */
  registerEndSpanListener(listner: OnEndSpanEventListener) {
    this.eventListenersLocal.push(listner);
  }

  private notifyEndSpan(root: RootSpan) {
    if (this.active) {
      this.logger.debug('starting to notify listeners the end of rootspans');
      if (this.eventListenersLocal && this.eventListenersLocal.length > 0) {
        for (const listener of this.eventListenersLocal) {
          listener.onEndSpan(root);
        }
      }
    } else {
      this.logger.debug('this tracer is inactivate cant notify endspan');
    }
  }

  /** Clears the current root span. */
  clearCurrentTrace() {
    this.currentRootSpan = null;
  }

  /**
   * Starts a span.
   * @param name The span name.
   * @param type The span type.
   * @param parentSpanId The parent span ID.
   */
  startSpan(name?: string, type?: string, parentSpanId?: string): Span {
    let newSpan: Span = null;
    if (!this.currentRootSpan) {
      this.logger.debug('no current trace found - must start a new root span first');
    } else {
      newSpan = this.currentRootSpan.startSpan(name, type, parentSpanId);
    }
    return newSpan;
  }

  /**
   * Wraps a function.
   * @param fn Function to wrap.
   */
  wrap<T>(fn: Func<T>): Func<T> {
    if (!this.active) {
      return fn;
    }

    // This is safe because isActive checks the value of this.namespace.
    const namespace = this.contextManager as cls.Namespace;
    return namespace.bind<T>(fn);
  }

  /**
   * The wrap emitter.
   * @param emitter The emitter.
   */
  wrapEmitter(emitter: NodeJS.EventEmitter): void {
    if (!this.active) {
      return;
    }

    // This is safe because isActive checks the value of this.namespace.
    const namespace = this.contextManager as cls.Namespace;
    namespace.bindEmitter(emitter);
  }
}
