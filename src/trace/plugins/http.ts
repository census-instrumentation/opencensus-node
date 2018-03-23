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

export class HttpPlugin extends BasePlugin<Tracer> implements Plugin<Tracer> {
 
   constructor() {
     super('http');
    }
      
   public applyPatch (http: any, tracer: Tracer, version: string) {
    
      this.setPluginContext(http, tracer, version);

      debug('patching http.Server.prototype.emit function')
      shimmer.wrap(http && http.Server && http.Server.prototype, 'emit', this.patchHttpRequest(this))

      debug('patching http.request function')
      shimmer.wrap(http, 'request', this.patchOutgoingRequest(this))

      debug('patching http.ServerResponse.prototype.writeHead function')
      shimmer.wrap(http && http.ServerResponse && http.ServerResponse.prototype, 'writeHead', this.patchWriteHead(this))

      return http
  }


 patchHttpRequest(self: HttpPlugin) {
  return function (orig) {
    return function (event, req, res) {
      debug('intercepted request event %s', event)
      if (event === 'request') {
        debug('intercepted request event call to %s.Server.prototype.emit', self.moduleName)
 

       /* if (isRequestBlacklisted(traceManager, req)) {
          debug('ignoring blacklisted request to %s', req.url)
          // don't leak previous transaction
          traceManager.clearCurrentTrace()
        } else */ { 
          let trace  = self.tracer.startTrace();
          //TODO: review this logic maybe and request method
          trace.name = req.url?(url.parse(req.url).pathname||'/'):'/';
          trace.type = 'request'
          //trans.req = req
          //trans.res = res
          //debug('created trace %o', {id: trace.traceId, name: trace.name, startTime: trace.startTime})

          eos(res, function (err) {
            if (!err) return self.tracer.endTrace()

            /*if (traceManager._conf.errorOnAbortedRequests && !trans.ended) {
              var duration = Date.now() - trans._timer.start
              if (duration > traceManager._conf.abortedErrorThreshold) {
                traceManager.captureError('Socket closed with active HTTP request (>' + (traceManager._conf.abortedErrorThreshold / 1000) + ' sec)', {
                  request: req,
                  extra: { abortTime: duration }
                })
              }
            } */

            // Handle case where res.end is called after an error occurred on the
            // stream (e.g. if the underlying socket was prematurely closed)
            res.on('prefinish', function () {
              self.tracer.endTrace()
            })
          })
        }
      }

      return orig.apply(this, arguments)
    }
  }
}
/*
function isRequestBlacklisted (agent, req) {
  var i

  for (i = 0; i < agent._conf.ignoreUrlStr.length; i++) {
    if (agent._conf.ignoreUrlStr[i] === req.url) return true
  }
  for (i = 0; i < agent._conf.ignoreUrlRegExp.length; i++) {
    if (agent._conf.ignoreUrlRegExp[i].test(req.url)) return true
  }

  var ua = req.headers['user-agent']
  if (!ua) return false

  for (i = 0; i < agent._conf.ignoreUserAgentStr.length; i++) {
    if (ua.indexOf(agent._conf.ignoreUserAgentStr[i]) === 0) return true
  }
  for (i = 0; i < agent._conf.ignoreUserAgentRegExp.length; i++) {
    if (agent._conf.ignoreUserAgentRegExp[i].test(ua)) return true
  }

  return false
}*/

    patchOutgoingRequest (self: HttpPlugin) {
      var spanType = 'ext.' + self.moduleName + '.http'

      return function (orig) {
        return function () {
      
          //debug('intercepted call to %s.request %o', self.moduleName, {id: id})

          var req = orig.apply(this, arguments)
          var name = req.method + ' ' + req._headers.host + url.parse(req.path).pathname

          //TODO only for tests. Remove and implement a blacklist
          if (name.indexOf('googleapi') < 0) {
            var span = self.tracer.startSpan(name, spanType)
            var id = span.id && span.traceId
          }

          if (!span) return req
          /*if (req._headers.host === traceManager._conf.serverHost) {
            debug('ignore %s request to intake API %o', moduleName, {id: id})
            return req
          } else {
            var protocol = req.agent && req.agent.protocol
            debug('request details: %o', {protocol: protocol, host: req._headers.host, id: id})
          }*/
          req.on('response', onresponse)

          return req

          function onresponse (res) {
            //debug('intercepted http.ClientRequest response event %o', {id: id})

            // Inspired by:
            // https://github.com/nodejs/node/blob/9623ce572a02632b7596452e079bba066db3a429/lib/events.js#L258-L274
            if (res.prependListener) {
              // Added in Node.js 6.0.0
              res.prependListener('end', onEnd)
            } else {
              var existing = res._events && res._events.end
              if (!existing) {
                res.on('end', onEnd)
              } else {
                if (typeof existing === 'function') {
                  res._events.end = [onEnd, existing]
                } else {
                  existing.unshift(onEnd)
                }
              }
            }

            function onEnd () {
              //debug('intercepted http.IncomingMessage end event %o', {id: id})
              span.end()
            }
          }
        }
      }
    }

    patchWriteHead (self: HttpPlugin) {
      return function (orig) {  
        return function () {
          var headers = arguments.length === 1
            ? this._headers // might be because of implicit headers
            : arguments[arguments.length - 1]
      
          var result = orig.apply(this, arguments)
      
          var trace = self.tracer.currentTrace
  
          if (trace) {
          // It shouldn't be possible for the statusCode to be falsy, but just in
          // case we're in a bad state we should avoid throwing
          //  trace.result = 'HTTP ' + (this.statusCode || '').toString()[0] + 'xx'
      
            // End transacton early in case of SSE
            if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
              Object.keys(headers).some(function (key) {
                if (key.toLowerCase() !== 'content-type') return false
                if (String(headers[key]).toLowerCase().indexOf('text/event-stream') !== 0) return false
                //debug('detected SSE response - ending trace %o', { id: trace.traceId })
                self.tracer.endTrace()
                return true
              })
            }
          }
      
          return result
        }
        }
    }

}

module.exports = new HttpPlugin()

