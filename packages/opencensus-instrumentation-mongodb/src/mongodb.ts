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
import * as mongodb from 'mongodb';
import * as semver from 'semver';
import * as shimmer from 'shimmer';
import {callbackify} from 'util';


/** Http instrumentation plugin for Opencensus */
export class MongoDBPlugin extends classes.BasePlugin {
  readonly SERVER_FNS = ['insert', 'update', 'remove', 'auth'];
  readonly CURSOR_FNS_FIRST = ['_find', '_getmore'];
  readonly SPAN_MONGODB_QUERY_TYPE = 'db.mongodb.query';
  logger: types.Logger;

  /** Constructs a new HttpPlugin instance. */
  constructor(moduleName: string) {
    super(moduleName);
  }

  // tslint:disable-next-line:no-any
  applyPatch(moduleExports: any, tracer: types.Tracer, version: string) {
    this.setPluginContext(moduleExports, tracer, version);
    this.logger = tracer.logger || logger.logger('debug');

    this.logger.debug('Patched MongoDB');

    if (moduleExports.Server) {
      this.logger.debug('patching mongodb-core.Server.prototype.command');
      shimmer.wrap(
          moduleExports.Server.prototype, 'command', this.patchCommand());
      this.logger.debug(
          'patching mongodb-core.Server.prototype functions:', this.SERVER_FNS);
      shimmer.massWrap(
          [moduleExports.Server.prototype], this.SERVER_FNS, this.patchQuery());
    }

    if (moduleExports.Cursor) {
      this.logger.debug(
          'patching mongodb-core.Cursor.prototype functions:',
          this.CURSOR_FNS_FIRST);
      shimmer.massWrap(
          [moduleExports.Cursor.prototype], this.CURSOR_FNS_FIRST,
          this.patchCursor());
    }

    return moduleExports;
  }

  /** Unpatches all HTTP patched function. */
  applyUnpatch(): void {
    shimmer.unwrap(this.moduleExports.Server.prototype, 'command');
    shimmer.massUnwrap(this.moduleExports.Server.prototype, this.SERVER_FNS);
    shimmer.massUnwrap(
        this.moduleExports.Cursor.prototype, this.CURSOR_FNS_FIRST);
  }

  patchCommand() {
    const plugin = this;
    return (original: types.Func<mongodb.Server>) => {
      // tslint:disable-next-line:no-any
      return function(this: mongodb.Server, ns: string, command: any):
          mongodb.Server {
            let span: types.Span;
            const index = arguments.length - 1;
            const resultHandler = arguments[index];

            if (plugin.tracer.currentRootSpan && arguments.length > 0 &&
                typeof resultHandler === 'function') {
              let type: string;
              if (command.createIndexes) {
                type = 'createIndexes';
              } else if (command.findandmodify) {
                type = 'findAndModify';
              } else if (command.ismaster) {
                type = 'ismaster';
              } else if (command.count) {
                type = 'count';
              } else {
                type = 'command';
              }

              span = plugin.tracer.startChildSpan(
                  ns + '.' + type, plugin.SPAN_MONGODB_QUERY_TYPE);
              arguments[index] = plugin.patchEnd(span, resultHandler);
            }

            return original.apply(this, arguments);
          };
    };
  }

  patchQuery() {
    const plugin = this;
    return (original: types.Func<mongodb.Server>) => {
      return function(this: mongodb.Server, ns: string): mongodb.Server {
        let span: types.Span;
        const index = arguments.length - 1;
        const resultHandler = arguments[index];

        if (plugin.tracer.currentRootSpan && arguments.length > 0 &&
            typeof resultHandler === 'function') {
          span = plugin.tracer.startChildSpan(
              ns + '.query', plugin.SPAN_MONGODB_QUERY_TYPE);
          arguments[index] = plugin.patchEnd(span, resultHandler);
        }

        return original.apply(this, arguments);
      };
    };
  }

  patchCursor() {
    const plugin = this;
    return (original: types.Func<mongodb.Cursor>) => {
      // tslint:disable-next-line:no-any
      return function(this: any): mongodb.Cursor {
        let span: types.Span;
        const index = 0;
        const resultHandler = arguments[index];

        if (plugin.tracer.currentRootSpan && arguments.length > 0 &&
            typeof resultHandler === 'function') {
          span = plugin.tracer.startChildSpan(
              this.ns + '.cursor', plugin.SPAN_MONGODB_QUERY_TYPE);
          arguments[index] = plugin.patchEnd(span, resultHandler);
        }

        return original.apply(this, arguments);
      };
    };
  }

  patchEnd(span: types.Span, resultHandler: Function): Function {
    // tslint:disable-next-line:no-any
    return function patchedEnd(this: any) {
      span.end();
      return resultHandler.apply(this, arguments);
    };
  }
}


const plugin = new MongoDBPlugin('mongodb');
export {plugin};
