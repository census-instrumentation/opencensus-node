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
import * as loggerTypes from '../../common/types';
import * as cls from '../../internal/cls';
import * as configTypes from '../config/types';
import {Sampler} from '../sampler/sampler';
import * as samplerTypes from '../sampler/types';

import {RootSpan} from './root-span';
import {Span} from './span';
import * as types from './types';


/**
 * This class represent a tracer.
 */
export class Tracer implements types.Tracer {
  /** Indicates if the tracer is active */
  private activeLocal: boolean;
  /** Manage context automatic propagation */
  private contextManager: cls.Namespace;
  /** A configuration for starting the tracer */
  private config: configTypes.TracerConfig;
  /** A list of end span event listeners */
  private eventListenersLocal: types.OnEndSpanEventListener[] = [];
  /** A list of ended root spans */
  private endedTraces: types.RootSpan[] = [];
  /** Bit to represent whether trace is sampled or not. */
  private readonly IS_SAMPLED = 0x1;
  /** A sampler used to make sample decisions */
  sampler: samplerTypes.Sampler;
  /** A configuration for starting the tracer */
  logger: loggerTypes.Logger = logger.logger();


  /** Constructs a new TraceImpl instance. */
  constructor() {
    this.activeLocal = false;
    this.contextManager = cls.createNamespace();
    this.clearCurrentTrace();
  }

  /** Gets the current root span. */
  get currentRootSpan(): types.RootSpan {
    return this.contextManager.get('rootspan');
  }

  /** Sets the current root span. */
  set currentRootSpan(root: types.RootSpan) {
    this.contextManager.set('rootspan', root);
  }

  /**
   * Starts a tracer.
   * @param config A tracer configuration object to start a tracer.
   */
  start(config: configTypes.TracerConfig): types.Tracer {
    this.activeLocal = true;
    this.config = config;
    this.logger = this.config.logger || logger.logger();
    this.sampler = new Sampler().probability(config.samplingRate);
    return this;
  }

  /** Stops the tracer. */
  stop(): types.Tracer {
    this.activeLocal = false;
    return this;
  }

  /** Gets the list of event listners. */
  get eventListeners(): types.OnEndSpanEventListener[] {
    return this.eventListenersLocal;
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
  startRootSpan<T>(
      options: types.TraceOptions, fn: (root: types.RootSpan) => T): T {
    return this.contextManager.runAndReturn((root) => {
      let newRoot = null;
      if (this.active) {
        let propagatedSample = null;

        // if there is a context propagation, keep the decistion
        if (options && options.spanContext) {
          if (options.spanContext.options) {
            propagatedSample =
                ((options.spanContext.options & this.IS_SAMPLED) !== 0);
          }
          if (!propagatedSample) {
            options.spanContext = null;
          }
        }
        const aRoot = new RootSpan(this, options);
        const sampleDecisition: boolean = propagatedSample ?
            propagatedSample :
            this.sampler.shouldSample(aRoot.traceId);

        if (sampleDecisition) {
          aRoot.start();
          this.currentRootSpan = aRoot;
          newRoot = aRoot;
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
  onEndSpan(root: types.RootSpan): void {
    if (this.active) {
      if (!root) {
        return this.logger.debug('cannot end trace - no active trace found');
      }
      if (this.currentRootSpan !== root) {
        this.logger.debug(
            'currentRootSpan != root on notifyEnd. Need more investigation.');
      }
      this.notifyEndSpan(root);
    }
  }

  /**
   * Registers an end span event listener.
   * @param listener The listener to register.
   */
  registerEndSpanListener(listner: types.OnEndSpanEventListener) {
    this.eventListenersLocal.push(listner);
  }

  private notifyEndSpan(root: types.RootSpan) {
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
  startChildSpan(name?: string, type?: string): types.Span {
    let newSpan: types.Span = null;
    if (!this.currentRootSpan) {
      this.logger.debug(
          'no current trace found - must start a new root span first');
    } else {
      newSpan = this.currentRootSpan.startChildSpan(name, type);
    }
    return newSpan;
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
   * the trace context binded to them.
   */
  wrapEmitter(emitter: NodeJS.EventEmitter): void {
    if (!this.active) {
      return;
    }
    const namespace = this.contextManager;
    namespace.bindEmitter(emitter);
  }
}
