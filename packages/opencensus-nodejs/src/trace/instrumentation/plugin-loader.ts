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

import {types} from '@opencensus/opencensus-core';
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
   * Returns a PluginNames object, build from a string array of target modules
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
   * named as "plugin". This function will attach a hook to be called
   * the first time the module is loaded.
   *
   * If pluginExtra is provided - (internal files not exported by default)
   * a property 'extraPluginModules' will be added to the moduleExports passed
   * as a parameter to the plugin. This new property maps the name chosen to
   * represent the internal module file and its exports loaded.
   *
   * @param pluginList A list of plugins.
   * @param pluginExtra A Map of target modules and internal files to be patched
   */
  loadPlugins(
      pluginList: types.PluginNames,
      pluginExtra?: types.PluginExtraFiles2Patch) {
    hook(Object.keys(pluginList), (exports, name, basedir) => {
      const version: string = this.getPackageVersion(name, basedir as string);
      this.logger.info('trying loading %s.%s', name, version);
      // tslint:disable-next-line:no-any
      let moduleExports: any = exports;
      if (!version) {
        return moduleExports;
      } else {
        this.logger.debug('applying patch to %s@%s module', name, version);
        this.logger.debug(
            'using package %s to patch %s', pluginList[name], name);
        // Expecting a plugin from module;
        try {
          const plugin: types.Plugin = require(pluginList[name]).plugin;
          this.plugins.push(plugin);

          if (pluginExtra) {
            this.loadInternalFiles(
                moduleExports, pluginExtra[name], name, basedir);
          }
          moduleExports =
              plugin.applyPatch(moduleExports, this.tracer, version);
        } catch (e) {
          this.logger.error(
              'could not load plugin %s of module %s. Error: %s',
              pluginList[name], name, e.message);
        }
        return moduleExports;
      }
    });
  }

  /**
   * Load internal files from a module and add their exports as property
   * 'extraPluginModules'
   */
  loadInternalFiles(
      // tslint:disable-next-line:no-any
      moduleExports: any, extraModulesList: types.PluginNames, name: string,
      basedir: string) {
    const extraModules: types.ExtraModuleExports = {};
    if (extraModulesList) {
      Object.keys(extraModulesList).map(modulename => {
        try {
          extraModules[modulename] =
              require(path.join(basedir, extraModulesList[modulename]));
        } catch (e) {
          this.logger.error(
              'Could not load internal file %s of module %s. Error: %s',
              extraModulesList[modulename], name, e.message);
        }
      });
    }
    if (!moduleExports.extraPluginModules) {
      if (extraModules) {
        moduleExports.extraPluginModules = extraModules;
      }
    } else {
      this.logger.error(
          'Property extraPluginModules already exist in module: %s. Could not set extra plugins',
          name);
    }
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
