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
import * as extend from 'extend';
import {types} from  '@opencensus/opencensus-core';
import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';

import {defaultConfig} from './config/config';
import {Constants} from './constants';
import {PluginLoader} from './instrumentation/plugingloader';


/** Implements a Tracing. */
export class Tracing implements types.Tracing {
  /** Indicates if the tracing is active */
  private active: boolean;
  /** A tracer object */
  private tracerLocal: types.Tracer;
  /** A plugin loader object */
  private pluginLoader: PluginLoader;
  /** Plugin names */
  private defaultPlugins: types.PluginNames;
  /** A configuration object to start the tracing */
  private config: types.Config;
  /** An object to log information to */
  private logger: types.Logger;
  /** Singleton instance */
  private static sgltnInstance: types.Tracing;

  /** Constructs a new TracingImpl instance. */
  constructor() {
    this.tracerLocal = new classes.Tracer();
    this.defaultPlugins = PluginLoader.defaultPluginsFromArray(
        Constants.DEFAULT_INSTRUMENTATION_MODULES);
  }

  /** Gets the trancing instance. */
  static get instance(): types.Tracing {
    return this.sgltnInstance || (this.sgltnInstance = new this());
  }

  /**
   * Starts the tracing.
   * @param userConfig A configuration object to start the tracing.
   * @returns The started tracing.
   */
  start(userConfig?: types.Config): types.Tracing {
    this.config = extend(
        true, {}, defaultConfig, {plugins: this.defaultPlugins}, userConfig);
    // TODO: Instance logger if no logger was passed
    this.logger = this.config.logger || logger.logger();
    this.logger.debug('config: %o', this.config);
    this.pluginLoader = new PluginLoader(this.logger, this.tracerLocal);
    this.pluginLoader.loadPlugins(this.config.plugins);

    if (!this.config.exporter) {
      const exporter = new classes.ConsoleExporter(this.config);
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
  get tracer(): types.Tracer {
    return this.tracerLocal;
  }

  /** Gets the exporter. */
  get exporter(): types.Exporter {
    return this.config.exporter;
  }

  /**
   * Registers an exporter to send the collected traces to.
   * @param exporter THe exporter to send the traces to.
   */
  registerExporter(exporter: types.Exporter): types.Tracing {
    this.config.exporter = exporter;
    this.tracer.registerEndSpanListener(exporter);
    return this;
  }
}