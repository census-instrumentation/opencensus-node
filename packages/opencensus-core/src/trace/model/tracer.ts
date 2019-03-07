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

import * as uuid from 'uuid';
import * as logger from '../../common/console-logger';
import * as loggerTypes from '../../common/types';
import * as cls from '../../internal/cls';
import * as configTypes from '../config/types';
import {TraceParams} from '../config/types';
import {Propagation} from '../propagation/types';
import {SamplerBuilder, TraceParamsBuilder} from '../sampler/sampler';
import * as samplerTypes from '../sampler/types';
import {NoRecordRootSpan} from './no-record/no-record-root-span';
import {RootSpan} from './root-span';
import * as types from './types';

/**
 * This class represent a tracer.
 */
export class CoreTracer implements types.Tracer {
  /** Indicates if the tracer is active */
  private activeLocal: boolean;
  /** Manage context automatic propagation */
  private contextManager: cls.Namespace;
  /** A configuration for starting the tracer */
  private config: configTypes.TracerConfig;
  /** A list of end span event listeners */
  private eventListenersLocal: types.SpanEventListener[] = [];
  /** Bit to represent whether trace is sampled or not. */
  private readonly IS_SAMPLED = 0x1;
  /** A sampler used to make sample decisions */
  sampler: samplerTypes.Sampler;
  /** A configuration for starting the tracer */
  logger: loggerTypes.Logger = logger.logger();
  /** A configuration object for trace parameters */
  activeTraceParams: TraceParams;

  /** Constructs a new TraceImpl instance. */
  constructor() {
    this.activeLocal = false;
    this.contextManager = cls.createNamespace();
    this.clearCurrentTrace();
    this.activeTraceParams = {};
  }

  /** Gets the current root span. */
  get currentRootSpan(): types.RootSpan {
    return this.contextManager.get('rootspan');
  }

  /** Sets the current root span. */
  set currentRootSpan(root: types.RootSpan) {
    if (this.contextManager.active) {
      this.contextManager.set('rootspan', root);
    }
  }

  /** A propagation instance */
  get propagation(): Propagation {
    return this.config ? this.config.propagation : null;
  }

  /**
   * Starts a tracer.
   * @param config A tracer configuration object to start a tracer.
   */
  start(config: configTypes.TracerConfig): types.Tracer {
    this.activeLocal = true;
    this.config = config;
    this.logger = this.config.logger || logger.logger();
    this.sampler = SamplerBuilder.getSampler(config.samplingRate);
    if (config.traceParams) {
      this.activeTraceParams.numberOfAnnontationEventsPerSpan =
          TraceParamsBuilder.getNumberOfAnnotationEventsPerSpan(
              config.traceParams);
      this.activeTraceParams.numberOfAttributesPerSpan =
          TraceParamsBuilder.getNumberOfAttributesPerSpan(config.traceParams);
      this.activeTraceParams.numberOfMessageEventsPerSpan =
          TraceParamsBuilder.getNumberOfMessageEventsPerSpan(
              config.traceParams);
      this.activeTraceParams.numberOfLinksPerSpan =
          TraceParamsBuilder.getNumberOfLinksPerSpan(config.traceParams);
    }
    return this;
  }

  /** Stops the tracer. */
  stop(): types.Tracer {
    this.activeLocal = false;
    return this;
  }

  /** Gets the list of event listeners. */
  get eventListeners(): types.SpanEventListener[] {
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
      let traceId;
      if (options && options.spanContext && options.spanContext.traceId) {
        traceId = options.spanContext.traceId;
      } else {
        // New root span.
        traceId = uuid.v4().split('-').join('');
      }
      const name = options && options.name ? options.name : 'span';
      const kind =
          options && options.kind ? options.kind : types.SpanKind.UNSPECIFIED;

      let parentSpanId = '';
      let traceState;
      if (options && options.spanContext) {
        // New child span.
        parentSpanId = options.spanContext.spanId || '';
        traceState = options.spanContext.traceState;
      }

      if (this.active) {
        const sampleDecision = this.makeSamplingDecision(options, traceId);
        if (sampleDecision) {
          const rootSpan =
              new RootSpan(this, name, kind, traceId, parentSpanId, traceState);
          this.currentRootSpan = rootSpan;
          rootSpan.start();
          return fn(rootSpan);
        }
      } else {
        this.logger.debug('Tracer is inactive, can\'t start new RootSpan');
      }
      const noRecordRootSpan = new NoRecordRootSpan(
          this, name, kind, traceId, parentSpanId, traceState);
      this.currentRootSpan = noRecordRootSpan;
      return fn(noRecordRootSpan);
    });
  }

  /** Notifies listeners of the span start. */
  onStartSpan(root: types.RootSpan): void {
    if (!this.active) return;
    if (!root) {
      return this.logger.debug('cannot start trace - no active trace found');
    }
    if (this.currentRootSpan !== root) {
      this.logger.debug(
          'currentRootSpan != root on notifyStart. Need more investigation.');
    }
    this.notifyStartSpan(root);
  }

  /** Notifies listeners of the span end. */
  onEndSpan(root: types.RootSpan): void {
    if (!this.active) return;
    if (!root) {
      return this.logger.debug('cannot end trace - no active trace found');
    }
    if (this.currentRootSpan !== root) {
      this.logger.debug(
          'currentRootSpan != root on notifyEnd. Need more investigation.');
    }
    this.notifyEndSpan(root);
  }

  /**
   * Registers an end span event listener.
   * @param listener The listener to register.
   */
  registerSpanEventListener(listener: types.SpanEventListener) {
    this.eventListenersLocal.push(listener);
  }

  /**
   * Unregisters an end span event listener.
   * @param listener The listener to unregister.
   */
  unregisterSpanEventListener(listener: types.SpanEventListener) {
    const index = this.eventListenersLocal.indexOf(listener, 0);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private notifyStartSpan(root: types.RootSpan) {
    this.logger.debug('starting to notify listeners the start of rootspans');
    if (this.eventListenersLocal && this.eventListenersLocal.length > 0) {
      for (const listener of this.eventListenersLocal) {
        listener.onStartSpan(root);
      }
    }
  }

  private notifyEndSpan(root: types.RootSpan) {
    this.logger.debug('starting to notify listeners the end of rootspans');
    if (this.eventListenersLocal && this.eventListenersLocal.length > 0) {
      for (const listener of this.eventListenersLocal) {
        listener.onEndSpan(root);
      }
    }
  }

  /** Clears the current root span. */
  clearCurrentTrace() {
    this.currentRootSpan = null;
  }

  /**
   * Starts a span.
   * @param nameOrOptions Span name string or SpanOptions object.
   * @param kind Span kind if not using SpanOptions object.
   */
  startChildSpan(
      nameOrOptions?: string|types.SpanOptions,
      kind?: types.SpanKind): types.Span {
    let newSpan: types.Span = null;
    if (!this.currentRootSpan) {
      this.logger.debug(
          'no current trace found - must start a new root span first');
    } else {
      newSpan = this.currentRootSpan.startChildSpan(nameOrOptions, kind);
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
   *     the trace context binded to them.
   */
  wrapEmitter(emitter: NodeJS.EventEmitter): void {
    if (!this.active) {
      return;
    }
    const namespace = this.contextManager;
    namespace.bindEmitter(emitter);
  }

  /** Determine whether to sample request or not. */
  private makeSamplingDecision(options: types.TraceOptions, traceId: string):
      boolean {
    // If users set a specific sampler in the TraceOptions, use it.
    if (options && options.samplingRate !== undefined &&
        options.samplingRate !== null) {
      return SamplerBuilder.getSampler(options.samplingRate)
          .shouldSample(traceId);
    }
    let propagatedSample = null;
    // if there is a context propagation, keep the decision
    if (options && options.spanContext && options.spanContext.options) {
      propagatedSample =
          ((options.spanContext.options & this.IS_SAMPLED) !== 0);
    }

    let sampleDecision: boolean = propagatedSample;
    if (!sampleDecision) {
      // Use the default global sampler
      sampleDecision = this.sampler.shouldSample(traceId);
    }
    return sampleDecision;
  }
}
