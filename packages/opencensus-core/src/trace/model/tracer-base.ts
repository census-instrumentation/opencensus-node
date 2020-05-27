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
import * as configTypes from '../config/types';
import { TraceParams } from '../config/types';
import { noopPropagation } from '../propagation/noop-propagation';
import { Propagation } from '../propagation/types';
import {
  DEFAULT_SAMPLING_RATE,
  SamplerBuilder,
  TraceParamsBuilder,
} from '../sampler/sampler';
import * as samplerTypes from '../sampler/types';
import { NoRecordRootSpan } from './no-record/no-record-root-span';
import { NoRecordSpan } from './no-record/no-record-span';
import { RootSpan } from './root-span';
import * as types from './types';

/**
 * This class represents a tracer.
 */
export class CoreTracerBase implements types.TracerBase {
  /** Indicates if the tracer is active */
  private activeLocal: boolean;
  /** A configuration for starting the tracer */
  private config!: configTypes.TracerConfig;
  /** A list of end span event listeners */
  private eventListenersLocal: types.SpanEventListener[] = [];
  /** Bit to represent whether trace is sampled or not. */
  private readonly IS_SAMPLED = 0x1;
  /** A sampler used to make sample decisions */
  sampler!: samplerTypes.Sampler;
  /** An object to log information */
  logger: loggerTypes.Logger = logger.logger();
  /** A configuration object for trace parameters */
  activeTraceParams: TraceParams;

  /** Constructs a new TraceImpl instance. */
  constructor() {
    this.activeLocal = false;
    this.activeTraceParams = {};
  }

  /** A propagation instance */
  get propagation(): Propagation {
    if (this.config && this.config.propagation) {
      return this.config.propagation;
    }
    return noopPropagation;
  }

  /** Sets the current root span. */
  setCurrentRootSpan(root: types.Span) {
    // no-op, this is only required in case of tracer with cls.
  }

  /**
   * Starts a tracer.
   * @param config A tracer configuration object to start a tracer.
   */
  start(config: configTypes.TracerConfig): this {
    this.activeLocal = true;
    this.config = config;
    this.logger = this.config.logger || logger.logger();
    this.sampler = SamplerBuilder.getSampler(
      config.samplingRate || DEFAULT_SAMPLING_RATE
    );
    if (config.traceParams) {
      this.activeTraceParams.numberOfAnnontationEventsPerSpan = TraceParamsBuilder.getNumberOfAnnotationEventsPerSpan(
        config.traceParams
      );
      this.activeTraceParams.numberOfAttributesPerSpan = TraceParamsBuilder.getNumberOfAttributesPerSpan(
        config.traceParams
      );
      this.activeTraceParams.numberOfMessageEventsPerSpan = TraceParamsBuilder.getNumberOfMessageEventsPerSpan(
        config.traceParams
      );
      this.activeTraceParams.numberOfLinksPerSpan = TraceParamsBuilder.getNumberOfLinksPerSpan(
        config.traceParams
      );
    }
    return this;
  }

  /** Stops the tracer. */
  stop(): this {
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
    options: types.TraceOptions,
    fn: (root: types.Span) => T
  ): T {
    const spanContext: types.SpanContext = options.spanContext || {
      spanId: '',
      traceId: uuid
        .v4()
        .split('-')
        .join(''),
    };
    const parentSpanId = spanContext.spanId;
    const traceId = spanContext.traceId;
    const name = options.name || 'span';
    const kind = options.kind || types.SpanKind.UNSPECIFIED;
    const traceState = spanContext.traceState;

    // Tracer is active
    if (this.active) {
      const sampleDecision = this.makeSamplingDecision(options, traceId);
      // Sampling is on
      if (sampleDecision) {
        const rootSpan = new RootSpan(
          this,
          name,
          kind,
          traceId,
          parentSpanId,
          traceState
        );
        // Add default attributes
        const defaultAttributes = this.config && this.config.defaultAttributes;
        if (defaultAttributes) {
          Object.keys(defaultAttributes).forEach(key => {
            rootSpan.addAttribute(key, defaultAttributes[key]);
          });
        }
        rootSpan.start();
        return fn(rootSpan);
      }
      // Sampling is off
      this.logger.debug('Sampling is off, starting new no record root span');
    } else {
      // Tracer is inactive
      this.logger.debug('Tracer is inactive, starting new no record root span');
    }

    const noRecordRootSpan = new NoRecordRootSpan(
      this,
      name,
      kind,
      traceId,
      parentSpanId,
      traceState
    );
    return fn(noRecordRootSpan);
  }

  /** Notifies listeners of the span start. */
  onStartSpan(span: types.Span): void {
    if (!this.active) return;
    this.notifyStartSpan(span);
  }

  /** Notifies listeners of the span end. */
  onEndSpan(span: types.Span): void {
    if (!this.active) return;
    this.notifyEndSpan(span);
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

  private notifyStartSpan(span: types.Span) {
    this.logger.debug('starting to notify listeners the start of spans');
    for (const listener of this.eventListenersLocal) {
      listener.onStartSpan(span);
    }
  }

  private notifyEndSpan(span: types.Span) {
    this.logger.debug('starting to notify listeners the end of spans');
    for (const listener of this.eventListenersLocal) {
      listener.onEndSpan(span);
    }
  }

  /**
   * Starts a span.
   * @param [options] A SpanOptions object to start a child span.
   */
  startChildSpan(options?: types.SpanOptions): types.Span {
    if (!options || !options.childOf) {
      this.logger.debug(
        'no current trace found - must start a new root span first'
      );
      return new NoRecordSpan(this);
    }
    const span = options.childOf.startChildSpan(options);

    // Add default attributes
    const defaultAttributes = this.config && this.config.defaultAttributes;
    if (defaultAttributes) {
      Object.keys(defaultAttributes).forEach(key => {
        span.addAttribute(key, defaultAttributes[key]);
      });
    }
    return span;
  }

  /** Determine whether to sample request or not. */
  private makeSamplingDecision(
    options: types.TraceOptions,
    traceId: string
  ): boolean {
    // If users set a specific sampler in the TraceOptions, use it.
    if (
      options &&
      options.samplingRate !== undefined &&
      options.samplingRate !== null
    ) {
      return SamplerBuilder.getSampler(options.samplingRate).shouldSample(
        traceId
      );
    }
    let propagatedSample = null;
    // if there is a context propagation, keep the decision
    if (
      options &&
      options.spanContext &&
      options.spanContext.options !== undefined
    ) {
      propagatedSample = (options.spanContext.options & this.IS_SAMPLED) !== 0;
      return !!propagatedSample;
    }
    // default global sampler
    return this.sampler.shouldSample(traceId);
  }
}
