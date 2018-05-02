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
import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';
import {HttpPlugin} from '@opencensus/opencensus-instrumentation-http';
import {B3Format} from '@opencensus/opencensus-propagation-b3';
import * as shimmer from 'shimmer';
import * as url from 'url';

export class HttpsPlugin extends HttpPlugin {
  /** Constructs a new HttpsPlugin instance. */
  constructor() {
    super('https');
  }

  /**
   * Patches HTTPS incoming and outcoming request functions.
   * @param moduleExporters The HTTPS package.
   * @param tracer A tracer instance to create spans on.
   * @param version The package version.
   */
  // tslint:disable:no-any
  applyPatch(moduleExporters: any, tracer: types.Tracer, version: string) {
    this.setPluginContext(moduleExporters, tracer, version);
    this.logger = tracer.logger || logger.logger('debug');

    shimmer.wrap(moduleExporters, 'request', this.patchOutgoingRequest());

    shimmer.wrap(
        moduleExporters && moduleExporters.Server &&
            moduleExporters.Server.prototype,
        'emit', this.patchIncomingRequest());

    return moduleExporters;
  }

  /** Unpatches all HTTPS patched function. */
  applyUnpatch(): void {
    shimmer.unwrap(this.moduleExporters, 'request');

    shimmer.unwrap(
        this.moduleExporters && this.moduleExporters.Server &&
            this.moduleExporters.Server.prototype,
        'emit');
  }
}

const plugin = new HttpsPlugin();
export {plugin};