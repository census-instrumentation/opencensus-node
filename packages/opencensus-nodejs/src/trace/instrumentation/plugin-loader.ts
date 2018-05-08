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
import * as fs from 'fs';
import * as path from 'path';
import * as hook from 'require-in-the-middle';

import {Constants} from '../constants';

/**
 * The PluginLoader class can load instrumentation plugins that
 * use a patch mechanism to enable automatic tracing for
 * specific target modules.
 */
export class PluginLoader {
  /** The tracer */
  private tracer: types.Tracer;
  /** logger */
  private logger: types.Logger;
  /** A list of loaded plugins. */
  plugins: types.Plugin[] = [];

  /**
   * Constructs a new PluginLoader instance.
   * @param tracer The tracer.
   */
  constructor(logger: types.Logger, tracer: types.Tracer) {
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
   * Returns a PlunginNames object, build from a string array of target modules
   * names, using the defaultPackageName.
   * @param modulesToPatch A list of modules to patch.
   * @returns Plugin names.
   */
  static defaultPluginsFromArray(modulesToPatch: string[]): types.PluginNames {
    const plugins = modulesToPatch.reduce(
        (plugins: types.PluginNames, moduleName: string) => {
          plugins[moduleName] = PluginLoader.defaultPackageName(moduleName);
          return plugins;
        },
        {} as types.PluginNames);
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
   * named as "plugin".
   * @param pluginList A list of plugins.
   */
  loadPlugins(pluginList: types.PluginNames) {
    const self = this;

    // tslint:disable:no-any
    hook(Object.keys(pluginList), (exports, name, basedir) => {
      const version = self.getPackageVersion(name, basedir as string);
      self.logger.info('trying loading %s.%s', name, version);
      if (!version) {
        return exports;
      } else {
        self.logger.debug('applying patch to %s@%s module', name, version);
        self.logger.debug(
            'using package %s to patch %s', pluginList[name], name);
        // Expecting a plugin from module;
        const plugin: types.Plugin = require(pluginList[name]).plugin;
        self.plugins.push(plugin);
        return plugin.applyPatch(exports, self.tracer, version);
      }
    });
  }


  /** Unloads plugins. */
  unloadPlugins() {
    for (const plugin of this.plugins) {
      plugin.applyUnpatch();
    }
    this.plugins = [];
  }

  /**
   * Adds a search path for plugin modules. Intended for testing purposes only.
   * @param searchPath The path to add.
   */
  static set searchPathForTest(searchPath: string) {
    module.paths.push(searchPath);
  }
}
