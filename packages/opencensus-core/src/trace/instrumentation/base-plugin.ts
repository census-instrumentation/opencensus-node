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
  /** Exporters from the nodejs module to be instrumented */
  // tslint:disable:no-any
  protected moduleExporters: any;
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
   * @param moduleExporters object moduleExporters to set as context
   * @param tracer tracer relating to context
   * @param version module version description
   */
  // tslint:disable:no-any
  protected setPluginContext(
      moduleExporters: any, tracer: modelTypes.Tracer, version: string) {
    this.moduleExporters = moduleExporters;
    this.tracer = tracer;
    this.version = version;
  }

  /**
   * Wraps a function.
   * @param nodule The module.
   * @param name The function name.
   * @param wrapper The wrapper.
   */
  protected wrap(nodule, name, wrapper) {
    shimmer.wrap(nodule, name, wrapper);
  }

  /**
   * Unwraps a function.
   * @param nodule The module.
   * @param name The function name.
   */
  protected unwrap(nodule, name) {
    shimmer.unwrap(nodule, name);
  }

  /**
   * Wraps one or more funcitons.
   * @param nodule The module.
   * @param names A list of function names.
   * @param wrapper The wrapper.
   */
  protected massWrap(nodule, names, wrapper) {
    shimmer.massWrap(nodule, names, wrapper);
  }

  /**
   * Unwraps one or more functions.
   * @param nodule The module.
   * @param names The list of function names.
   */
  protected massUnwrap(nodule, names) {
    shimmer.massUnwrap(nodule, names);
  }

  // TODO: review this implementation
  // From the perspective of an instrumentation module author,
  // that applyUnpatch is abstract makes it seem like patching is optional,
  // while unpatching is not. It should be the other way around

  // tslint:disable:no-any
  applyPatch(moduleExporters: any, tracer: modelTypes.Tracer, version: string):
      any {
    this.setPluginContext(moduleExporters, tracer, version);
  }

  abstract applyUnpatch(): void;
}
