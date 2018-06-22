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

import {BasePlugin, Func, Span} from '@opencensus/core';
import {logger, Logger} from '@opencensus/core';
import * as mongodb from 'mongodb';
import * as semver from 'semver';
import * as shimmer from 'shimmer';

export type MongoDB = typeof mongodb;

/** MongoDB instrumentation plugin for Opencensus */
export class MongoDBPlugin extends BasePlugin {
  private readonly SERVER_FNS = ['insert', 'update', 'remove', 'auth'];
  private readonly CURSOR_FNS_FIRST = ['_find', '_getmore'];
  private readonly SPAN_MONGODB_QUERY_TYPE = 'db.mongodb.query';

  /** Constructs a new MongoDBPlugin instance. */
  constructor(moduleName: string) {
    super(moduleName);
  }

  /**
   * Patches MongoDB operations.
   */
  protected applyPatch() {
    this.logger.debug('Patched MongoDB');

    if (this.moduleExports.Server) {
      this.logger.debug('patching mongodb-core.Server.prototype.command');
      shimmer.wrap(
          this.moduleExports.Server.prototype, 'command' as never,
          this.getPatchCommand());
      this.logger.debug(
          'patching mongodb-core.Server.prototype functions:', this.SERVER_FNS);
      shimmer.massWrap(
          [this.moduleExports.Server.prototype], this.SERVER_FNS as never[],
          this.getPatchQuery());
    }

    if (this.moduleExports.Cursor) {
      this.logger.debug(
          'patching mongodb-core.Cursor.prototype functions:',
          this.CURSOR_FNS_FIRST);
      shimmer.massWrap(
          [this.moduleExports.Cursor.prototype],
          this.CURSOR_FNS_FIRST as never[], this.getPatchCursor());
    }

    return this.moduleExports;
  }

  /** Unpatches all MongoDB patched functions. */
  applyUnpatch(): void {
    shimmer.unwrap(this.moduleExports.Server.prototype, 'command');
    shimmer.massUnwrap(this.moduleExports.Server.prototype, this.SERVER_FNS);
    shimmer.massUnwrap(
        this.moduleExports.Cursor.prototype, this.CURSOR_FNS_FIRST);
  }

  /** Creates spans for Command operations */
  private getPatchCommand() {
    const plugin = this;
    return (original: Func<mongodb.Server>) => {
      return function(
                 // tslint:disable-next-line:no-any
                 this: mongodb.Server, ns: string, command: any,
                 // tslint:disable-next-line:no-any
                 ...args: any[]): mongodb.Server {
        let resultHandler = args[args.length - 1];
        if (plugin.tracer.currentRootSpan && arguments.length > 0 &&
            typeof resultHandler === 'function') {
          let type: string;
          if (command.createIndexes) {
            type = 'createIndexes';
          } else if (command.findandmodify) {
            type = 'findAndModify';
          } else if (command.ismaster) {
            type = 'isMaster';
          } else if (command.count) {
            type = 'count';
          } else {
            type = 'command';
          }

          const span = plugin.tracer.startChildSpan(
              ns + '.' + type, plugin.SPAN_MONGODB_QUERY_TYPE);
          resultHandler = plugin.patchEnd(span, resultHandler);
        }

        return original.apply(this, arguments);
      };
    };
  }

  /** Creates spans for Query operations */
  private getPatchQuery() {
    const plugin = this;
    return (original: Func<mongodb.Server>) => {
      // tslint:disable-next-line:no-any
      return function(this: mongodb.Server, ns: string, ...args: any[]):
          mongodb.Server {
            let resultHandler = args[args.length - 1];
            if (plugin.tracer.currentRootSpan && arguments.length > 0 &&
                typeof resultHandler === 'function') {
              const span = plugin.tracer.startChildSpan(
                  ns + '.query', plugin.SPAN_MONGODB_QUERY_TYPE);
              resultHandler = plugin.patchEnd(span, resultHandler);
            }

            return original.apply(this, arguments);
          };
    };
  }

  /** Creates spans for Cursor operations */
  private getPatchCursor() {
    const plugin = this;
    return (original: Func<mongodb.Cursor>) => {
      // tslint:disable-next-line:no-any
      return function(this: any, ...args: any[]): mongodb.Cursor {
        let resultHandler = args[0];
        if (plugin.tracer.currentRootSpan && arguments.length > 0 &&
            typeof resultHandler === 'function') {
          const span = plugin.tracer.startChildSpan(
              this.ns + '.cursor', plugin.SPAN_MONGODB_QUERY_TYPE);
          resultHandler = plugin.patchEnd(span, resultHandler);
        }

        return original.apply(this, arguments);
      };
    };
  }

  /**
   * Ends a created span.
   * @param span The created span to end.
   * @param resultHandler A callback function.
   */
  patchEnd(span: Span, resultHandler: Function): Function {
    // tslint:disable-next-line:no-any
    return function patchedEnd(this: any) {
      span.end();
      return resultHandler.apply(this, arguments);
    };
  }
}


const plugin = new MongoDBPlugin('mongodb');
export {plugin};
