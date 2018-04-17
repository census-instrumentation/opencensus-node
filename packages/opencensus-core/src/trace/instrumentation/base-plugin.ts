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
import {Tracer} from '../model/types';

/**
 * This class represent the base to patch plugin
 */
export abstract class BasePlugin {
  // tslint:disable:no-any
  exporter: any;
  moduleName: string;
  tracer: Tracer;
  version: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }
  /**
   * Set modified plugin to the context.
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

  protected wrap(nodule, name, wrapper) {
      shimmer.wrap(nodule, name, wrapper);
  }

  protected unwrap(nodule, name) {
      shimmer.unwrap(nodule, name);
  }

  protected massWrap(nodule,names, wrapper) {
     shimmer.massWrap(nodule, names, wrapper);
  } 

  protected massUnwrap(nodule,names) {
    shimmer.massUnwrap(nodule, names);
  } 
 
 
}