/**
 * Copyright 2019, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
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

import {BasePlugin, CanonicalCode, Span, SpanKind} from '@opencensus/core';
import * as redis from 'redis';
import * as semver from 'semver';
import * as shimmer from 'shimmer';

// exported from
// https://github.com/NodeRedis/node_redis/blob/master/lib/command.js
export interface RedisCommand {
  command: string;
  args: string[];
  buffer_args: boolean;
  callback: Function;
  call_on_write: boolean;
}

/** Redis instrumentation plugin for Opencensus */
export class RedisPlugin extends BasePlugin {
  /** Constructs a new Redis instance. */
  constructor(moduleName: string) {
    super(moduleName);
  }

  /**
   * Patches Redis operations.
   */
  protected applyPatch() {
    this.logger.debug('Patched redis');

    if (semver.lt(this.version, '2.6.0')) {
      this.logger.info('disabling redis plugin because version isnt supported');
      return this.moduleExports;
    }

    if (this.moduleExports.RedisClient) {
      this.logger.debug('patching redis.RedisClient.prototype.create_stream');
      shimmer.wrap(
          this.moduleExports.RedisClient.prototype, 'create_stream',
          this.getPatchCreateStream());
      this.logger.debug('patching redis.RedisClient.prototype.internal_send');
      shimmer.wrap(
          this.moduleExports.RedisClient.prototype, 'internal_send_command',
          this.getPatchSendCommand());
      this.logger.debug('patching redis.RedisClient.prototype.createClient');
      shimmer.wrap(
          this.moduleExports, 'createClient', this.getPatchCreateClient());
    }
    return this.moduleExports;
  }

  /** Unpatches all Redis patched functions. */
  applyUnpatch(): void {
    if (semver.lt(this.version, '2.6.0')) return;

    shimmer.unwrap(
        this.moduleExports.RedisClient.prototype, 'internal_send_command');
    shimmer.unwrap(this.moduleExports, 'createClient');
    shimmer.unwrap(this.moduleExports.RedisClient.prototype, 'create_stream');
  }

  /** Patch internal event emmitter to propagate the context */
  private getPatchCreateStream() {
    const plugin = this;
    return function createStreamWrap(original: Function) {
      // tslint:disable-next-line:no-any
      return function create_stream_trace(this: any) {
        if (!this.stream) {
          Object.defineProperty(this, 'stream', {
            get() {
              return this._patched_redis_stream;
            },
            set(val) {
              plugin.tracer.wrapEmitter(val);
              this._patched_redis_stream = val;
            }
          });
        }
        return original.apply(this, arguments);
      };
    };
  }

  /** Patch client event emmitter to propagate the context */
  private getPatchCreateClient() {
    const plugin = this;
    return function createClientWrap(original: Function) {
      return function createClientTrace(this: redis.RedisClient):
          redis.RedisClient {
            const client: redis.RedisClient = original.apply(this, arguments);
            plugin.tracer.wrapEmitter(client);
            return client;
          };
    };
  }

  /** Patch send command internal to trace requests */
  private getPatchSendCommand() {
    const plugin = this;
    return function internalSendCommandWrap(original: Function) {
      return function internal_send_command_trace(
          this: redis.RedisClient, cmd: RedisCommand|undefined) {
        if (!plugin.tracer.currentRootSpan) {
          return original.apply(this, arguments);
        }
        // New versions of redis (2.4+) use a single options object instead
        // of separate named arguments.
        if (arguments.length === 1 && typeof cmd === 'object') {
          const span = plugin.tracer.startChildSpan(
              {name: `redis-${cmd.command}`, kind: SpanKind.CLIENT});
          if (span === null) return original.apply(this, arguments);

          span.addAttribute('command', cmd.command);
          cmd.callback = plugin.patchEnd(span, cmd.callback);
          return original.apply(this, arguments);
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
    const patchedEnd = function(this: redis.RedisClient, err?: Error) {
      if (err instanceof Error) {
        span.setStatus(CanonicalCode.UNKNOWN, err.message);
      } else {
        span.setStatus(CanonicalCode.OK);
      }
      span.end();
      return resultHandler.apply(this, arguments);
    };
    return this.tracer.wrap(patchedEnd);
  }
}

const plugin = new RedisPlugin('redis');
export {plugin};
