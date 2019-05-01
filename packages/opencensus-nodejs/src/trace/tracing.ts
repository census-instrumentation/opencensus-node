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
import {logger} from '@opencensus/core';
import * as extend from 'extend';
import {defaultConfig} from './config/default-config';
import {Constants} from './constants';
import {PluginLoader} from './instrumentation/plugin-loader';

const NOOP_EXPORTER = new core.NoopExporter();

/** Implements a Tracing. */
export class Tracing implements core.Tracing {
  /** A tracer object */
  readonly tracer: core.Tracer;
  /** A plugin loader object */
  private pluginLoader?: PluginLoader;
  /** Plugin names */
  private defaultPlugins: core.PluginNames;
  /** A configuration object to start the tracing */
  private configLocal: core.Config = {};
  /** An object to log information to. Logs to the JS console by default. */
  private logger: core.Logger = logger.logger();
  /** Singleton instance */
  private static singletonInstance: core.Tracing;
  /** Indicates if the tracing is active */
  private activeLocal = false;

  /** Constructs a new TracingImpl instance. */
  constructor() {
    this.tracer = new core.CoreTracer();
    this.defaultPlugins = PluginLoader.defaultPluginsFromArray(
        Constants.DEFAULT_INSTRUMENTATION_MODULES);
  }

  /** Gets the tracing instance. */
  static get instance(): core.Tracing {
    return this.singletonInstance || (this.singletonInstance = new this());
  }

  /** Gets active status  */
  get active(): boolean {
    return this.activeLocal;
  }

  /** Gets config */
  get config(): core.Config {
    return this.configLocal;
  }

  /**
   * Starts tracing.
   * @param userConfig A configuration object to start tracing.
   * @returns The started Tracing instance.
   */
  start(userConfig?: core.Config): core.Tracing {
    this.configLocal = extend(
        true, {}, defaultConfig, {plugins: this.defaultPlugins}, userConfig);

    this.logger =
        this.configLocal.logger || logger.logger(this.configLocal.logLevel);
    this.configLocal.logger = this.logger;
    this.logger.debug('config: %o', this.configLocal);
    this.pluginLoader =
        new PluginLoader(this.logger, this.tracer, this.configLocal.stats);
    this.pluginLoader.loadPlugins(this.configLocal.plugins as core.PluginNames);

    if (!this.configLocal.exporter) {
      const exporter = new core.ConsoleExporter(this.configLocal);
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
    if (this.pluginLoader) {
      this.pluginLoader.unloadPlugins();
    }
    this.configLocal = {};
    this.logger = logger.logger();
  }

  /** Gets the exporter. */
  get exporter(): core.Exporter {
    return this.configLocal.exporter ?
        this.configLocal.exporter as core.Exporter :
        NOOP_EXPORTER;
  }

  /**
   * Registers an exporter to send the collected traces to.
   * @param exporter The exporter to send the traces to.
   */
  registerExporter(exporter: core.Exporter): core.Tracing {
    if (this.configLocal.exporter) {
      this.unregisterExporter(this.configLocal.exporter);
    }
    if (exporter) {
      this.configLocal.exporter = exporter;
      this.tracer.registerSpanEventListener(exporter);
    }
    return this;
  }

  /**
   * Unregisters an exporter.
   * @param exporter The exporter to stop sending traces to.
   */
  unregisterExporter(exporter: core.Exporter): core.Tracing {
    this.tracer.unregisterSpanEventListener(exporter);
    this.configLocal.exporter = NOOP_EXPORTER;
    return this;
  }
}
