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
import * as http from 'http';
import * as https from 'https';
import * as semver from 'semver';
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
   */
  protected applyPatch() {
    this.logger.debug('applying pacth to %s@%s', this.moduleName, this.version);

    if (this.moduleExports && this.moduleExports.Server &&
        this.moduleExports.Server.prototype) {
      shimmer.wrap(
          this.moduleExports && this.moduleExports.Server &&
              this.moduleExports.Server.prototype,
          'emit', this.getPatchIncomingRequestFunction());
    } else {
      this.logger.error(
          'Could not apply patch to %s.emit. Interface is not as expected.',
          this.moduleName);
    }

    shimmer.wrap(
        this.moduleExports, 'request', this.getPatchHttpsOutgoingRequest());
    if (semver.satisfies(this.version, '>=8.0.0')) {
      shimmer.wrap(
          this.moduleExports, 'get', this.getPatchHttpsOutgoingRequest());
    }

    return this.moduleExports;
  }

  /** Patches HTTPS outgoing requests */
  private getPatchHttpsOutgoingRequest() {
    return (original: types.Func<http.ClientRequest>):
               types.Func<http.ClientRequest> => {
      const plugin = this;
      return function httpsOutgoingRequest(
                 options, callback): http.ClientRequest {
        // Makes sure options will have default HTTPS parameters
        if (typeof (options) !== 'string') {
          options.protocol = options.protocol || 'https:';
          options.port = options.port || 443;
          options.agent = options.agent || https.globalAgent;
        }
        return (plugin.getPatchOutgoingRequestFunction())(original)(
            options, callback);
      };
    };
  }

  /** Unpatches all HTTPS patched function. */
  protected applyUnpatch(): void {
    if (this.moduleExports && this.moduleExports.Server &&
        this.moduleExports.Server.prototype) {
      shimmer.unwrap(
          this.moduleExports && this.moduleExports.Server &&
              this.moduleExports.Server.prototype,
          'emit');
    }
    shimmer.unwrap(this.moduleExports, 'request');
    if (semver.satisfies(this.version, '>=8.0.0')) {
      shimmer.unwrap(this.moduleExports, 'get');
    }
  }
}

const plugin = new HttpsPlugin();
export {plugin};
