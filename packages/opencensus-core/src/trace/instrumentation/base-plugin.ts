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
import * as shimmer from 'shimmer';
import * as types from './types';
import {Tracer} from '../model/types';

/** This class represent the base to patch plugin. */
export abstract class BasePlugin implements types.Plugin {

  /** The service to send the collected traces */
  // tslint:disable:no-any
  protected exporter: any;
  /** The module name */
  protected moduleName: string;
  /** A tracer object. */
  protected tracer: Tracer;
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
   * @param exporter object module to set on context
   * @param tracer tracer relating to context
   * @param version module version description
   */
  // tslint:disable:no-any
  protected setPluginContext(exporter: any, tracer: Tracer, version: string) {
    this.exporter = exporter;
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
  protected massWrap(nodule,names, wrapper) {
     shimmer.massWrap(nodule, names, wrapper);
  } 

  /**
   * Unwraps one or more functions.
   * @param nodule The module.
   * @param names The list of function names.
   */
  protected massUnwrap(nodule,names) {
    shimmer.massUnwrap(nodule, names);
  } 
 
  // tslint:disable:no-any
  applyPatch(exporter: any, tracer: Tracer, version: string): any{
    this.setPluginContext(exporter, tracer, version); 
  }

  abstract applyUnpatch(): void;

}