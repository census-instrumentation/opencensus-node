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
import * as path from 'path';
import * as semver from 'semver';

import {logger} from '../../common/console-logger';
import {Logger} from '../../common/types';
import * as modelTypes from '../model/types';

import * as types from './types';

/**
 * Maps a name (key) representing a internal file module and its exports
 */
export type ModuleExportsMapping = {
  // tslint:disable-next-line:no-any
  [key: string]: any;
};


/** This class represent the base to patch plugin. */
export abstract class BasePlugin implements types.Plugin {
  /** Exports from the nodejs module to be instrumented */
  // tslint:disable-next-line:no-any
  protected moduleExports: any;
  /** The module name */
  protected moduleName: string;
  /** A tracer object. */
  protected tracer: modelTypes.Tracer;
  /** The module version. */
  protected version: string;
  /** a logger */
  protected logger: Logger;
  /** list of internal files that need patch and are not exported by default */
  protected readonly internalFileList: types.PluginInternalFiles;
  /**  internal files loaded */
  protected internalFilesExports: ModuleExportsMapping;
  /** module directory - used to load internal files */
  protected basedir: string;

  /**
   * Constructs a new BasePlugin instance.
   * @param moduleName The module name.
   */
  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  /**
   * Sets modified plugin to the context.
   * @param moduleExports nodejs module exports to set as context
   * @param tracer tracer relating to context
   * @param version module version description
   * @param basedir module absolute path
   */
  private setPluginContext(
      // tslint:disable-next-line:no-any
      moduleExports: any, tracer: modelTypes.Tracer, version: string,
      basedir?: string) {
    this.moduleExports = moduleExports;
    this.tracer = tracer;
    this.version = version;
    this.basedir = basedir;
    this.logger = tracer.logger;
    this.internalFilesExports = this.loadInternalFiles();
  }

  /**
   * Method that enables the instrumentation patch.
   *
   * This method implements the GoF Template Method Pattern
   * 'enable' is the invariant part of the pattern and
   * 'applyPatch' the variant.
   *
   * @param moduleExports nodejs module exports from the module to patch
   * @param tracer a tracer instance
   * @param version version of the current instaled module to patch
   * @param basedir module absolute path
   */
  enable<T>(
      // tslint:disable-next-line:no-any
      moduleExports: T, tracer: modelTypes.Tracer, version: string,
      basedir: string) {
    this.setPluginContext(moduleExports, tracer, version, basedir);
    return this.applyPatch();
  }

  /** Method to disable the instrumentation  */
  disable() {
    this.applyUnpatch();
  }

  /**
   * This method implements the GoF Template Method Pattern,
   * 'applyPatch' is the variant part, each instrumentation should
   * implement its own version, 'enable' method is the invariant.
   * It will be called when enable is called.
   *
   */
  // tslint:disable-next-line:no-any
  protected abstract applyPatch(): any;
  protected abstract applyUnpatch(): void;


  /**
   * Load internal files according to version range
   */
  private loadInternalFiles(): ModuleExportsMapping {
    let result: ModuleExportsMapping = null;
    if (this.internalFileList) {
      this.logger.debug('loadInternalFiles %o', this.internalFileList);
      Object.keys(this.internalFileList).forEach(versionRange => {
        if (semver.satisfies(this.version, versionRange)) {
          if (result) {
            this.logger.warn(
                'Plugin for %s@%s, has overlap version range (%s) for internal files: %o',
                this.moduleName, this.version, versionRange,
                this.internalFileList);
          }
          result = this.loadInternalModuleFiles(
              this.internalFileList[versionRange], this.basedir);
        }
      });
      if (!result) {
        this.logger.debug(
            'No internal file could be loaded for %s@%s', this.moduleName,
            this.version);
      }
    }

    return result;
  }


  /**
   * Load internal files from a module and  set internalFilesExports
   */
  private loadInternalModuleFiles(
      extraModulesList: types.PluginNames,
      basedir: string): ModuleExportsMapping {
    const extraModules: ModuleExportsMapping = {};
    if (extraModulesList) {
      Object.keys(extraModulesList).forEach(moduleName => {
        try {
          this.logger.debug('loading File %s', extraModulesList[moduleName]);
          extraModules[moduleName] =
              require(path.join(basedir, extraModulesList[moduleName]));
        } catch (e) {
          this.logger.error(
              'Could not load internal file %s of module %s. Error: %s',
              path.join(basedir, extraModulesList[moduleName]), this.moduleName,
              e.message);
        }
      });
    }
    return extraModules;
  }
}
