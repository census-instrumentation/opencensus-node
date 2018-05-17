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
import * as shimmer from 'shimmer';
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
      moduleExports: any, tracer: modelTypes.Tracer, version: string) {
    this.moduleExports = moduleExports;
    this.tracer = tracer;
    this.version = version;
  }


  // TODO: review this implementation
  // From the perspective of an instrumentation module author,
  // that applyUnpatch is abstract makes it seem like patching is optional,
  // while unpatching is not. It should be the other way around

  // tslint:disable:no-any
  applyPatch(moduleExports: any, tracer: modelTypes.Tracer, version: string):
      any {
    this.setPluginContext(moduleExports, tracer, version);
  }

  abstract applyUnpatch(): void;
}
