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

import {Logger, Plugin, PluginNames, Tracer} from '@opencensus/core';
import * as fs from 'fs';
import * as path from 'path';
import * as hook from 'require-in-the-middle';

import {Constants} from '../constants';

enum HookState {
  UNINITIALIZED,
  ENABLED,
  DISABLED
}

/**
 * The PluginLoader class can load instrumentation plugins that
 * use a patch mechanism to enable automatic tracing for
 * specific target modules.
 */
export class PluginLoader {
  /** The tracer */
  private tracer: Tracer;
  /** logger */
  private logger: Logger;
  /** A list of loaded plugins. */
  plugins: Plugin[] = [];
  /**
   * A field that tracks whether the r-i-t-m hook has been loaded for the
   * first time, as well as whether the hook body is enabled or not.
   */
  private hookState = HookState.UNINITIALIZED;

  /**
   * Constructs a new PluginLoader instance.
   * @param tracer The tracer.
   */
  constructor(logger: Logger, tracer: Tracer) {
    this.tracer = tracer;
    this.logger = logger;
  }

  /**
   * Gets the default package name for a target module. The default package
   * name uses the default scope and a default prefix.
   * @param moduleName The module name.
   * @returns The default name for that package.
   */
  private static defaultPackageName(moduleName: string): string {
    return `${Constants.OPENCENSUS_SCOPE}/${
        Constants.DEFAULT_PLUGIN_PACKAGE_NAME_PREFIX}-${moduleName}`;
  }


  /**
   * Returns a PluginNames object, build from a string array of target modules
   * names, using the defaultPackageName.
   * @param modulesToPatch A list of modules to patch.
   * @returns Plugin names.
   */
  static defaultPluginsFromArray(modulesToPatch: string[]): PluginNames {
    const plugins =
        modulesToPatch.reduce((plugins: PluginNames, moduleName: string) => {
          plugins[moduleName] = PluginLoader.defaultPackageName(moduleName);
          return plugins;
        }, {} as PluginNames);
    return plugins;
  }


  /**
   * Gets the package version.
   * @param name Name.
   * @param basedir The base directory.
   */
  private getPackageVersion(name: string, basedir: string) {
    let version = null;
    if (basedir) {
      const pkgJson = path.join(basedir, 'package.json');
      try {
        version = JSON.parse(fs.readFileSync(pkgJson).toString()).version;
      } catch (e) {
        this.logger.error(
            'could not get version of %s module: %s', name, e.message);
      }
    } else {
      version = process.versions.node;
    }
    return version;
  }


  /**
   * Loads a list of plugins (using a map of the target module name
   * and its instrumentation plugin package name). Each plugin module
   * should implement the core Plugin interface and export an instance
   * named as "plugin". This function will attach a hook to be called
   * the first time the module is loaded.
   * @param pluginList A list of plugins.
   */
  loadPlugins(pluginList: PluginNames) {
    if (this.hookState === HookState.UNINITIALIZED) {
      hook(Object.keys(pluginList), (exports, name, basedir) => {
        if (this.hookState !== HookState.ENABLED) {
          return exports;
        }
        const version = this.getPackageVersion(name, basedir as string);
        this.logger.info('trying loading %s.%s', name, version);
        if (!version) {
          return exports;
        }
        this.logger.debug('applying patch to %s@%s module', name, version);
        this.logger.debug(
            'using package %s to patch %s', pluginList[name], name);
        // Expecting a plugin from module;
        try {
          const plugin: Plugin = require(pluginList[name]).plugin;
          this.plugins.push(plugin);
          return plugin.enable(exports, this.tracer, version, basedir);
        } catch (e) {
          this.logger.error(
              'could not load plugin %s of module %s. Error: %s',
              pluginList[name], name, e.message);
          return exports;
        }
      });
    }
    this.hookState = HookState.ENABLED;
  }


  /** Unloads plugins. */
  unloadPlugins() {
    for (const plugin of this.plugins) {
      plugin.disable();
    }
    this.plugins = [];
    this.hookState = HookState.DISABLED;
  }

  /**
   * Adds a search path for plugin modules. Intended for testing purposes only.
   * @param searchPath The path to add.
   */
  static set searchPathForTest(searchPath: string) {
    module.paths.push(searchPath);
  }
}
