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

import * as semver from 'semver'
import * as shimmer from 'shimmer'
import * as url from 'url'
import * as eos from 'end-of-stream'

import {Tracer} from '../model/tracer'
import {debug} from '../../internal/util'
import {HttpPlugin} from './http'

class HttpsPlugin extends HttpPlugin {

  constructor() {
    super()
    this.moduleName = 'https'
  }

  public applyPatch (https: any, tracer: Tracer, version: string) {
    
        this.setPluginContext(https, tracer, version);

        debug('patching  https.Server.prototype.emit function')
        shimmer.wrap(https && https.Server && https.Server.prototype, 'emit', this.patchHttpRequest(this))

      // From Node.js v9.0.0 and onwards, https requests no longer just call the
      // http.request function. So to correctly instrument outgoing HTTPS requests
      // in all supported Node.js versions, we'll only only instrument the
      // https.request function if the Node version is v9.0.0 or above.
      //
      // This change was introduced in:
      // https://github.com/nodejs/node/commit/5118f3146643dc55e7e7bd3082d1de4d0e7d5426
      if (semver.gte(version, '9.0.0')) {
        debug('patching  https.request function')
        shimmer.wrap(https, 'request',this.patchOutgoingRequest(this))
      }

      return https
 }
}

module.exports = new HttpsPlugin()