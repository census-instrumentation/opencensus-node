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

import * as fs from 'fs'
import * as path from 'path'
import {Tracer} from '../model/tracer'
import {debug} from '../../internal/util'


export class PluginLoader {
    
    //private modules: string[];
    private _tracer: Tracer;

    constructor(tracer: Tracer) {
        this._tracer = tracer;
    }

    public loadPlugins(plugins: string[]) {
        //TODO - maybe review this solution
        let hook = require('require-in-the-middle');
        let self = this;
        
        hook(plugins, function (exports, name, basedir) {
            var pkg, version
        
            if (basedir) {
              pkg = path.join(basedir, 'package.json')
              try {
                version = JSON.parse(fs.readFileSync(pkg).toString()).version
              } catch (e) {
                debug('could not shim %s module: %s', name, e.message)
                return exports
              }
            } else {
              version = process.versions.node
            }
        
            debug('patching %s@%s module', name, version)
            //TODO: maybe a more generic way to pass plugin path, ex.: pass by a parameter
            return require('./' + name ).applyPatch(exports, self._tracer, version)
          })
    }

}