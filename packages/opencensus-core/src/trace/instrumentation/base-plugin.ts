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


// TODO: improve Jsdoc comments

/** This class represent the base to patch plugin. */
export abstract class BasePlugin implements types.Plugin {
  /** Exports from the nodejs module to be instrumented */
  // tslint:disable:no-any
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
  protected internalFileList: types.PluginInternalFiles;
  /**  internal files loaded */
  protected internalFilesExports: types.ModuleExports;
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
   */
  // tslint:disable:no-any
  protected setPluginContext(
      moduleExports: any, tracer: modelTypes.Tracer, version: string,
      basedir?: string) {
    this.moduleExports = moduleExports;
    this.tracer = tracer;
    this.version = version;
    this.basedir = basedir;
    this.logger = tracer.logger || logger.logger();
    this.internalFilesExports = this.loadInternalFiles();
  }


  // TODO: review this implementation
  // From the perspective of an instrumentation module author,
  // that applyUnpatch is abstract makes it seem like patching is optional,
  // while unpatching is not. It should be the other way around

  // tslint:disable:no-any
  applyPatch(
      moduleExports: any, tracer: modelTypes.Tracer, version: string,
      basedir?: string): any {
    this.setPluginContext(moduleExports, tracer, version, basedir);
  }

  abstract applyUnpatch(): void;


  /**
   * Load internal files according to version range
   */
  private loadInternalFiles(): types.ModuleExports {
    let result: types.ModuleExports = null;
    this.logger.debug('loadInternalFiles %o', this.internalFileList);
    if (this.internalFileList) {
      Object.keys(this.internalFileList).map(versionRange => {
        if (semver.satisfies(this.version, versionRange)) {
          result = this.loadInternalModuleFiles(
              this.internalFileList[versionRange], this.basedir);
        }
        if (!result) {
          this.logger.debug(
              'No internal file could be loaded for %s@%s', this.moduleName,
              this.version);
        }
      });
    }
    return result;
  }


  /**
   * Load internal files from a module and  set internalFilesExports
   */
  private loadInternalModuleFiles(
      extraModulesList: types.PluginNames,
      basedir: string): types.ModuleExports {
    const extraModules: types.ModuleExports = {};
    if (extraModulesList) {
      Object.keys(extraModulesList).map(modulename => {
        try {
          this.logger.debug('loading File %s', extraModulesList[modulename]);
          extraModules[modulename] =
              require(path.join(basedir, extraModulesList[modulename]));
        } catch (e) {
          this.logger.error(
              'Could not load internal file %s of module %s. Error: %s',
              path.join(basedir, extraModulesList[modulename]), this.moduleName,
              e.message);
        }
      });
    }
    return extraModules;
  }
}
