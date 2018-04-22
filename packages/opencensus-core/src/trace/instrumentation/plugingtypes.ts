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

/**
 * Interface Plugin to apply patch.
 */
export interface Plugin<T> {
  applyPatch(module: {}, tracer: T, version: string): void;
}
/**
 * This class represent the base to patch plugin
 */
export abstract class BasePlugin<T> {
  module: {};
  moduleName: string;
  tracer: T;
  version: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }
  /**
   * Set modified plugin to the context.
   * @param http object module to set on context
   * @param tracer tracer relating to context
   * @param version module version description
   */
  setPluginContext(http: {}, tracer: T, version: string) {
    this.module = http;
    this.tracer = tracer;
    this.version = version;
  }
}