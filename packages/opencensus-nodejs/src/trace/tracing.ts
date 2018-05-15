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
import {classes, logger, types} from '@opencensus/opencensus-core';
import * as extend from 'extend';

import {defaultConfig} from './config/default-config';
import {Constants} from './constants';
import {PluginLoader} from './instrumentation/plugin-loader';


/** Implements a Tracing. */
export class Tracing implements types.Tracing {
  /** A tracer object */
  readonly tracer: types.Tracer;
  /** A plugin loader object */
  private pluginLoader: PluginLoader;
  /** Plugin names */
  private defaultPlugins: types.PluginNames;
  /** A configuration object to start the tracing */
  private configLocal: types.Config = null;
  /** An object to log information to */
  private logger: types.Logger = null;
  /** Singleton instance */
  private static singletonInstance: types.Tracing;
  /** Indicates if the tracing is active */
  private activeLocal: boolean;

  /** Constructs a new TracingImpl instance. */
  constructor() {
    this.tracer = new classes.Tracer();
    this.defaultPlugins = PluginLoader.defaultPluginsFromArray(
        Constants.DEFAULT_INSTRUMENTATION_MODULES);
  }

  /** Gets the trancing instance. */
  static get instance(): types.Tracing {
    return this.singletonInstance || (this.singletonInstance = new this());
  }

  // TODO: tracing interface should be updated
  /** Gets active status  */
  get active(): boolean {
    return this.activeLocal;
  }

  /** Gets config */
  get config(): types.Config {
    return this.configLocal;
  }

  /**
   * Starts the tracing.
   * @param userConfig A configuration object to start the tracing.
   * @returns The started tracing.
   */
  start(userConfig?: types.Config): types.Tracing {
    this.configLocal = extend(
        true, {}, defaultConfig, {plugins: this.defaultPlugins}, userConfig);

    this.logger =
        this.configLocal.logger || logger.logger(this.configLocal.logLevel);
    this.configLocal.logger = this.logger;
    this.logger.debug('config: %o', this.configLocal);
    this.pluginLoader = new PluginLoader(this.logger, this.tracer);
    this.pluginLoader.loadPlugins(
        this.configLocal.plugins as types.PluginNames);

    if (!this.configLocal.exporter) {
      const exporter = new classes.ConsoleExporter(this.configLocal);
      this.registerExporter(exporter);
    } else {
      this.registerExporter(this.configLocal.exporter);
    }
    this.activeLocal = true;
    this.tracer.start(this.configLocal);
    return this;
  }

  /** Stops the tracing. */
  stop() {
    this.activeLocal = false;
    this.tracer.stop();
    this.pluginLoader.unloadPlugins();
    this.configLocal = null;
    this.logger = null;
    // TODO: maybe some exporter logic when stop tracing
  }


  /** Gets the exporter. */
  get exporter(): types.Exporter {
    return this.configLocal ? this.configLocal.exporter as types.Exporter :
                              null;
  }

  /**
   * Registers an exporter to send the collected traces to.
   * @param exporter THe exporter to send the traces to.
   */
  registerExporter(exporter: types.Exporter): types.Tracing {
    if (exporter) {
      if (this.configLocal.exporter) {
        this.unRegisterExporter(this.configLocal.exporter);
      }
      this.configLocal.exporter = exporter;
      this.tracer.registerSpanEventListener(exporter);
    } else {
      // TODO: if unRegisterExporter go public, this logic may not be
      // necessary - register a null to unRegister
      if (this.configLocal.exporter) {
        this.unRegisterExporter(this.configLocal.exporter);
      }
    }
    return this;
  }


  /**
   * Registers an exporter to send the collected traces to.
   * @param exporter THe exporter to send the traces to.
   */
  // TODO: maybe this method should be added to Tracing interface
  private unRegisterExporter(exporter: types.Exporter): types.Tracing {
    // TODO: maybe an unRegisterEndSpanListener method should be added to Tracer
    const index = this.tracer.eventListeners.indexOf(exporter, 0);
    if (index > -1) {
      this.tracer.eventListeners.splice(index, 1);
    }
    this.configLocal.exporter = null;
    return this;
  }
}
