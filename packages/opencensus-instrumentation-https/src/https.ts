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

import {HttpPlugin} from '@opencensus/instrumentation-http';
import {types} from '@opencensus/opencensus-core';
import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';
import * as shimmer from 'shimmer';
import * as url from 'url';

/** Https instrumentation plugin for Opencensus */
export class HttpsPlugin extends HttpPlugin {
  /** Constructs a new HttpsPlugin instance. */
  constructor() {
    super('https');
  }

  /**
   * Patches HTTPS incoming and outcoming request functions.
   * @param moduleExports The HTTPS package.
   * @param tracer A tracer instance to create spans on.
   * @param version The package version.
   */
  // tslint:disable:no-any
  applyPatch(moduleExports: any, tracer: types.Tracer, version: string) {
    this.setPluginContext(moduleExports, tracer, version);
    this.logger = tracer.logger || logger.logger('debug');

    this.logger.debug('applying pacth to %s@%s', this.moduleName, this.version);

    if (moduleExports && moduleExports.Server &&
        moduleExports.Server.prototype) {
      shimmer.wrap(
          moduleExports && moduleExports.Server &&
              moduleExports.Server.prototype,
          'emit', this.getPatchIncomingRequestFunction());
    } else {
      this.logger.error(
          'Could not apply patch to %s.emit. Interface is not as expected.',
          this.moduleName);
    }

    // TODO: review the need to patch 'request'

    shimmer.wrap(moduleExports, 'get', this.getPatchOutgoingRequestFunction());

    return moduleExports;
  }

  /** Unpatches all HTTPS patched function. */
  applyUnpatch(): void {
    if (this.moduleExports && this.moduleExports.Server &&
        this.moduleExports.Server.prototype) {
      shimmer.unwrap(
          this.moduleExports && this.moduleExports.Server &&
              this.moduleExports.Server.prototype,
          'emit');
    }
    shimmer.unwrap(this.moduleExports, 'get');
  }
}

const plugin = new HttpsPlugin();
export {plugin};
