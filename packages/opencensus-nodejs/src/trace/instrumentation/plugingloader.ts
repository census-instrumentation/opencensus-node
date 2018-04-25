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

import {types} from  '@opencensus/opencensus-core';
import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';

import * as fs from 'fs';
import * as path from 'path';
import * as hook from 'require-in-the-middle';

import {Constants} from '../constants';

/** Defines a plugin loader. */
export class PluginLoader {
  /** The tracer */
  private tracer: types.Tracer;
  /** A list of plugins. */
  private plugins: types.Plugin[] = [];
  /** logger */
  private logger: types.Logger;

  /**
   * Constructs a new PluginLoader instance.
   * @param tracer The tracer.
   */
  constructor(logger: types.Logger, tracer: types.Tracer) {
    this.tracer = tracer;
    this.logger = logger;
  }

  /**
   * Gets the default package name.
   * @param moduleName The module name.
   * @returns The default name for that package.
   */
  private static defaultPackageName(moduleName): string {
    return `${Constants.SCOPE}/${Constants.PLUGIN_PACKAGE_NAME_PREFIX}-${
        moduleName}`;
  }


  /**
   * Gets the plugins to use.
   * @param modulesToPatch A list of modules to patch.
   * @returns Plugin names.
   */
  static defaultPluginsFromArray(modulesToPatch: string[]): types.PluginNames {
    const plugins = modulesToPatch.reduce((plugins, moduleName) => {
      plugins[moduleName] = PluginLoader.defaultPackageName(moduleName);
      return plugins;
    }, {});
    return plugins;
  }


  /**
   * Gets the plugin import path.
   * @param pkgname Pakage name.
   * @param name Name.
   * @returns The import path.
   */
  private getPlugingImportPath(pkgname: string, name: string): string {
    return path.join(pkgname, 'build', 'src', name);
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
        this.logger.error('could not get version of %s module: %s', name, e.message);
      }
    } else {
      version = process.versions.node;
    }
    return version;
  }


  /**
   * Loads plugins.
   * @param pluginList A list of plugins.
   */
  loadPlugins(pluginList: types.PluginNames) {
    const self = this;

    hook(Object.keys(pluginList), (exports, name, basedir) => {
      const version = self.getPackageVersion(name, basedir);
      if (!version) {
        return exports;
      } else {
        self.logger.debug('applying patch to %s@%s module', name, version);
        self.logger.debug('using package %s to patch %s', pluginList[name], name);
        const pluginImportPath =
            self.getPlugingImportPath(pluginList[name], name);
        const plugin: types.Plugin = require(pluginImportPath);
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
}
