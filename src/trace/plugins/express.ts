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
import {Plugin, BasePlugin} from './plugingtypes'

export class ExpressPlugin extends BasePlugin<Tracer> implements Plugin<Tracer> {

    readonly mountStackLockedSym = Symbol('OpencensusMountStackLocked')
    readonly unwrap = Symbol('OpencensusUnwrap')
    readonly agentInitialized = Symbol('OpencensusAgentInitialized')
    readonly knexStackObj = Symbol('OpencensusKnexStackObj')
    readonly staticFile = Symbol('OpencensusStaticFile')
    readonly expressMountStack = Symbol('OpencensusExpressMountStack')

    constructor() {
      super('express');
     }
 
    objectToString(o) {
      return Object.prototype.toString.call(o);
    }
    
    isError(e) {
      return (this.objectToString(e) === '[object Error]' || e instanceof Error);
    }
  
    //TODO - review this method logic
   public applyPatch (express: any, tracer: Tracer, version: string) {

      let self:ExpressPlugin = this;
    
      this.setPluginContext(express, tracer, version);

      if (!semver.satisfies(version, '^4.0.0')) {
        debug('express version %s not supported - aborting...', version)
        return express
      }

      // express 5 moves the router methods onto a prototype
      var routerProto = semver.satisfies(version, '^5')
        ? (express.Router && express.Router.prototype)
        : express.Router

      var layerPatchedSymbol = Symbol('layer-patched')
      var reportedSymbol = Symbol('reported')
    
      function patchLayer (layer) {
      if (!layer[layerPatchedSymbol]) {
        layer[layerPatchedSymbol] = true
        debug('patching  express.Router.Layer.handle function')
        shimmer.wrap(layer, 'handle', function (orig) {
          if (orig.length !== 4) return orig
          return function (err, req, res, next) {
            if ((self.isError(err) || typeof err === 'string') && !err[reportedSymbol]) {
              err[reportedSymbol] = true
              //TODO handle errors
              //traceManager.captureError(err, { request: req })
            }
            return orig.apply(this, arguments)
          }
        })
      }
    }

    debug('patching  express.Router.process_params function')

    shimmer.wrap(routerProto, 'process_params', function (orig) {
      return function (layer, called, req, res, done) {
        patchLayer(layer)
        return orig.apply(this, arguments)
      }
    })

    debug('patching  express.Router.use function')

    // The `use` function is called when Express app or Router sub-app is
    // initialized. This is the only place where we can get a hold of the
    // original path given when mounting a sub-app.
    shimmer.wrap(routerProto, 'use', function (orig) {
      return function (fn) {
        if (typeof fn === 'string' && Array.isArray(this.stack)) {
          var offset = this.stack.length
          var result = orig.apply(this, arguments)
          var layer

          for (; offset < this.stack.length; offset++) {
            layer = this.stack[offset]

            if (layer && (fn !== '/' || (layer.regexp && !layer.regexp.fast_slash))) {
              debug('patching  layer.handle_request function (layer: %s)', layer.name)

              shimmer.wrap(layer, 'handle_request', function (orig) {
                return function (req, res, next) {
                  if (req.route) {
                    // We use the signal of the route being set on the request
                    // object as indicating that the correct route have been
                    // found. When this happens we should no longer push and pop
                    // mount-paths on the stack
                    req[self.mountStackLockedSym] = true
                  } else if (!req[self.mountStackLockedSym] && typeof next === 'function') {
                    if (!req[self.expressMountStack]) req[self.expressMountStack] = [fn]
                    else req[self.expressMountStack].push(fn)

                    arguments[2] = function () {
                      req[self.expressMountStack].pop()
                      return next.apply(this, arguments)
                    }
                  }

                  return orig.apply(this, arguments)
                }
              })
            } else {
              debug('skip patching  layer.handle_request (layer: %s, path: %s)',
                    (layer && layer.name) || typeof layer, fn)
            }
          }

          return result
        } else {
          return orig.apply(this, arguments)
        }
      }
    })

    debug('patching  express.static function')

    shimmer.wrap(express, 'static', function wrapStatic (orig) {
      // By the time of this writing, Express adds a `mime` property to the
      // `static` function that needs to be copied to the wrapped function.
      // Instead of only copying the `mime` function, let's loop over all
      // properties in case new properties are added in later versions of
      // Express.
      Object.keys(orig).forEach(function (prop) {
        debug('copying property %s from express.static', prop)
        wrappedStatic[prop] = orig[prop]
      })

      return wrappedStatic

      function wrappedStatic () {
        var origServeStatic = orig.apply(this, arguments)
        return function serveStatic (req, res, next) {
          req[self.staticFile] = true

          return origServeStatic(req, res, nextHook)

          function nextHook (err) {
            if (!err) req[self.staticFile] = false
            return next.apply(this, arguments)
          }
        }
      }
    })

    return express
  }

}

module.exports = new ExpressPlugin()
