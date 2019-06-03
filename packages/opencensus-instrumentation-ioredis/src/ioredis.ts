/**
 * Copyright 2019, OpenCensus Authors
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

import { BasePlugin, CanonicalCode, Span, SpanKind } from '@opencensus/core';
import * as ioredis from 'ioredis';
import * as semver from 'semver';
import * as shimmer from 'shimmer';

export interface IORedisCommand {
  reject: (err: Error) => void;
  resolve: (result: {}) => void;
  promise: Promise<{}>;
  args: Array<string | Buffer | number>;
  callback: Function | undefined;
  name: string;
}

/** IORedis instrumentation plugin for Opencensus */
export class IORedisPlugin extends BasePlugin {
  /** Constructs a new IORedis instance. */
  constructor(moduleName: string) {
    super(moduleName);
  }

  /**
   * Patches IORedis operations.
   */
  protected applyPatch() {
    this.logger.debug('Patched ioredis');

    if (!semver.satisfies(this.version, '>=2.0.0')) {
      this.logger.info(
        'disabling ioredis plugin because version isnt supported'
      );
      return this.moduleExports;
    }

    if (this.moduleExports) {
      this.logger.debug('patching ioredis.prototype.sendCommand');
      shimmer.wrap(
        this.moduleExports.prototype,
        'sendCommand',
        this.getPatchSendCommand()
      );
    }

    return this.moduleExports;
  }

  /** Unpatches all IORedis patched functions. */
  applyUnpatch(): void {
    if (!semver.satisfies(this.version, '>=2.0.0')) return;

    shimmer.unwrap(this.moduleExports.prototype, 'sendCommand');
  }

  /** Patch send command internal to trace requests */
  private getPatchSendCommand() {
    const plugin = this;
    const addArguments =
      typeof this.options === 'object' &&
      this.options.detailedCommands === true;

    return function internalSendCommandWrap(original: Function) {
      return function internal_send_command_trace(
        this: ioredis.Redis,
        command: IORedisCommand
      ) {
        if (!plugin.tracer.currentRootSpan) {
          return original.apply(this, arguments);
        }

        const span = plugin.tracer.startChildSpan({
          name: `redis-${command.name}`,
          kind: SpanKind.CLIENT,
        });
        if (span === null) return original.apply(this, arguments);

        span.addAttribute('command', command.name);
        if (addArguments) {
          span.addAttribute('arguments', JSON.stringify(command.args));
        }

        if (typeof command.reject === 'function') {
          command.reject = plugin.tracer.wrap(command.reject);
        }
        if (typeof command.resolve === 'function') {
          command.resolve = plugin.tracer.wrap(command.resolve);
        }
        if (typeof command.callback === 'function') {
          command.callback = plugin.patchEnd(span, command.callback);
        }
        if (typeof command.promise === 'object') {
          // in node 10 or bluebird, we can attach to 'finally'
          if (typeof command.promise.finally === 'function') {
            command.promise.finally(plugin.patchEnd(span));
          } else if (typeof command.promise.then === 'function') {
            command.promise
              .then(plugin.patchEnd(span))
              .catch(plugin.patchEnd(span));
          }
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
  patchEnd(span: Span, resultHandler?: Function): () => Promise<{}> {
    const patchedEnd = function(this: ioredis.Redis, err?: Error) {
      if (err instanceof Error) {
        span.setStatus(CanonicalCode.UNKNOWN, err.message);
      }
      span.end();
      if (typeof resultHandler === 'function') {
        return resultHandler.apply(this, arguments);
      }
    };
    return this.tracer.wrap(patchedEnd);
  }
}

const plugin = new IORedisPlugin('ioredis');
export { plugin };
