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

import {PluginNames, RootSpan, SamplerImpl, TracerImpl} from '@opencensus/opencensus-core';
import {Span} from '@opencensus/opencensus-core';
import {debug} from '@opencensus/opencensus-core';
import {Tracer} from '@opencensus/opencensus-core';
import {Tracing} from '@opencensus/opencensus-core';
import {Sampler} from '@opencensus/opencensus-core';
import {Logger} from '@opencensus/opencensus-core';
import {ConsoleExporter, Exporter, NoopExporter} from '@opencensus/opencensus-core';
import {Config} from '@opencensus/opencensus-core';
import * as logger from '@opencensus/opencensus-core';

import {defaultConfig} from './config/config';
import {CONSTANTS} from './constants';
import {PluginLoader} from './instrumentation/plugingloader';
import * as extend from 'extend';

/** Implements a Tracing. */
export class TracingImpl implements Tracing {
  /** Indicates if the tracing is active */
  private active: boolean;
  /** A tracer object */
  private tracerLocal: Tracer;
  /** A plugin loader object */
  private pluginLoader: PluginLoader;
  /** Plugin names */
  private defaultPlugins: PluginNames;
  /** A configuration object to start the tracing */
  private config: Config;
  /** An object to log information to */
  private logger: Logger;
  /** Singleton instance */
  private static sgltnInstance: Tracing;

  /** Constructs a new TracingImpl instance. */
  constructor() {
    this.tracerLocal = new TracerImpl();
    this.pluginLoader = new PluginLoader(this.tracerLocal);
    this.defaultPlugins = PluginLoader.defaultPluginsFromArray(
        CONSTANTS.DEFAULT_INSTRUMENTATION_MODULES);
  }

  /** Gets the trancing instance. */
  static get instance() {
    return this.sgltnInstance || (this.sgltnInstance = new this());
  }

  /**
   * Starts the tracing.
   * @param userConfig A configuration object to start the tracing.
   * @returns The started tracing.
   */
  start(userConfig?: Config): Tracing {
    this.config = extend(
        true, {}, defaultConfig, {plugins: this.defaultPlugins}, userConfig);
    // TODO: Instance logger if no logger was passed
    this.logger = this.config.logger || logger.logger();
    debug('config: %o', this.config);
    this.pluginLoader.loadPlugins(this.config.plugins);

    if (!this.config.exporter) {
      const exporter = new ConsoleExporter(this.config);
      this.registerExporter(exporter);
    }else{
      this.registerExporter(this.config.exporter);
    }
    this.active = true;
    this.tracerLocal.start(this.config);
    return this;
  }

  /** Stops the tracing. */
  stop() {
    this.active = false;
    this.tracerLocal.stop();
  }

  /** Gets the tracer. */
  get tracer(): Tracer {
    return this.tracerLocal;
  }

  /** Gets the exporter. */
  get exporter(): Exporter {
    return this.config.exporter;
  }

  /**
   * Registers an exporter to send the collected traces to.
   * @param exporter THe exporter to send the traces to.
   */
  registerExporter(exporter: Exporter): Tracing {
    this.config.exporter = exporter;
    this.tracer.registerEndSpanListener(exporter);
    return this;
  }
}