/**
 * Copyright 2018, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  BasePlugin,
  CanonicalCode,
  deserializeBinary,
  MessageEventType,
  PluginInternalFiles,
  serializeBinary,
  Span,
  SpanContext,
  SpanKind,
  TagMap,
  TagTtl,
  TraceOptions,
} from '@opencensus/core';
import {
  deserializeSpanContext,
  serializeSpanContext,
} from '@opencensus/propagation-binaryformat';
import { EventEmitter } from 'events';
import * as grpcTypes from 'grpc';
import * as lodash from 'lodash';
import * as shimmer from 'shimmer';

import * as clientStats from './grpc-stats/client-stats';
import * as serverStats from './grpc-stats/server-stats';

const sizeof = require('object-sizeof');

/** The metadata key under which span context is stored as a binary value. */
export const GRPC_TRACE_KEY = 'grpc-trace-bin';
/** The metadata key under which TagMap is stored as a binary value. */
export const GRPC_TAGS_KEY = 'grpc-tags-bin';
const findIndex = lodash.findIndex;

//
// Types definitions
//
export type GrpcModule = typeof grpcTypes;

type MakeClientConstructor = typeof grpcTypes.makeGenericClientConstructor;
type RegisterMethod = typeof grpcTypes.Server.prototype.register;

interface Status {
  code: number;
  details: string;
  metadata: grpcTypes.Metadata;
}

type ServerCall =
  | typeof grpcTypes.ServerUnaryCall
  | typeof grpcTypes.ServerReadableStream
  | typeof grpcTypes.ServerWritableStream
  | typeof grpcTypes.ServerDuplexStream;

type ServerCallWithMeta = ServerCall & {
  metadata: grpcTypes.Metadata;
  status: Status;
  // tslint:disable-next-line:no-any
  request?: any;
} & EventEmitter;

export type SendUnaryDataCallback = (
  error: grpcTypes.ServiceError | null,
  // tslint:disable-next-line:no-any
  value?: any,
  trailer?: grpcTypes.Metadata,
  flags?: grpcTypes.writeFlags
) => void;

export type GrpcClientFunc = typeof Function & {
  path: string;
  requestStream: boolean;
  responseStream: boolean;
};

// tslint:disable:variable-name
// tslint:disable-next-line:no-any
let Metadata: any;

// tslint:disable-next-line:no-any
let GrpcClientModule: any;

const UNLIMITED_PROPAGATION_MD = {
  tagTtl: TagTtl.UNLIMITED_PROPAGATION,
};

/** gRPC instrumentation plugin for Opencensus */
export class GrpcPlugin extends BasePlugin {
  /** Span grpc attributes */
  static readonly ATTRIBUTE_GRPC_KIND = 'grpc.kind'; // SERVER or CLIENT
  static readonly ATTRIBUTE_GRPC_METHOD = 'grpc.method';
  static readonly ATTRIBUTE_GRPC_STATUS_CODE = 'grpc.status_code';
  static readonly ATTRIBUTE_GRPC_ERROR_NAME = 'grpc.error_name';
  static readonly ATTRIBUTE_GRPC_ERROR_MESSAGE = 'grpc.error_message';

  protected readonly internalFileList: PluginInternalFiles = {
    '0.13 - 1.6': {
      client: 'src/node/src/client.js',
      metadata: 'src/node/src/metadata.js',
    },
    '^1.7': { client: 'src/client.js', metadata: 'src/metadata.js' },
  };

  /** Constructs a new GrpcPlugin instance. */
  constructor() {
    super('grpc');
  }

  /** Patches gRPC incoming and outcoming request functions. */
  protected applyPatch() {
    this.logger.debug('applying patch to %s@%s', this.moduleName, this.version);

    shimmer.wrap(
      this.moduleExports.Server.prototype,
      'register' as never,
      this.getPatchServer()
    );

    if (this.internalFilesExports) {
      GrpcClientModule = this.internalFilesExports['client'];
      Metadata = this.internalFilesExports['metadata'];

      shimmer.wrap(
        GrpcClientModule,
        'makeClientConstructor',
        this.getPatchClient()
      );
    }

    return this.moduleExports;
  }

  /** Unpatches all gRPC patched function. */
  protected applyUnpatch(): void {
    shimmer.unwrap(this.moduleExports.Server.prototype, 'register');

    if (this.internalFilesExports) {
      shimmer.unwrap(GrpcClientModule, 'makeClientConstructor');
    }
  }

  /**
   * Returns a function that patches the gRPC server register function in order
   * to create trace spans for gRPC service methods.
   * @returns function that returns a patch for server.register function
   */
  private getPatchServer() {
    return (originalRegister: RegisterMethod) => {
      const plugin = this;
      plugin.logger.debug('patched server');
      return function register<RequestType, ResponseType>(
        // tslint:disable-next-line:no-any
        this: grpcTypes.Server & { handlers: any },
        name: string,
        handler: grpcTypes.handleCall<RequestType, ResponseType>,
        serialize: grpcTypes.serialize<RequestType>,
        deserialize: grpcTypes.deserialize<RequestType>,
        type: string
      ) {
        const result = originalRegister.apply(this, arguments);
        const handlerSet = this.handlers[name];

        // Patch the methods that are invoked when a gRPC service call is
        // made. The function 'func' is the user-implemented handling function.
        shimmer.wrap(
          handlerSet,
          'func',
          (originalFunc: grpcTypes.handleCall<RequestType, ResponseType>) => {
            return function func(
              this: typeof handlerSet,
              call: ServerCallWithMeta,
              callback: SendUnaryDataCallback
            ) {
              const self = this;

              const traceOptions: TraceOptions = {
                name: `grpc.${name.replace('/', '')}`,
                kind: SpanKind.SERVER,
              };

              const spanContext = GrpcPlugin.getSpanContext(call.metadata);
              if (spanContext) {
                traceOptions.spanContext = spanContext;
              }
              plugin.logger.debug(
                'path func: %s',
                JSON.stringify(traceOptions)
              );

              return plugin.tracer.startRootSpan(traceOptions, rootSpan => {
                if (!rootSpan) {
                  return originalFunc.call(self, call, callback);
                }

                rootSpan.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_METHOD, name);
                if (traceOptions.kind) {
                  rootSpan.addAttribute(
                    GrpcPlugin.ATTRIBUTE_GRPC_KIND,
                    traceOptions.kind
                  );
                }

                switch (type) {
                  case 'unary':
                  case 'client_stream':
                    return plugin.clientStreamAndUnaryHandler(
                      plugin,
                      rootSpan,
                      call,
                      callback,
                      originalFunc,
                      self
                    );
                  case 'server_stream':
                  case 'bidi':
                    return plugin.serverStreamAndBidiHandler(
                      plugin,
                      rootSpan,
                      call,
                      originalFunc,
                      self
                    );
                  default:
                    break;
                }
              });
            };
          }
        );
        return result;
      };
    };
  }

  /**
   * Handler Unary and Client Stream Calls
   */
  private clientStreamAndUnaryHandler<RequestType, ResponseType>(
    plugin: GrpcPlugin,
    rootSpan: Span,
    call: ServerCallWithMeta,
    callback: SendUnaryDataCallback,
    original: grpcTypes.handleCall<RequestType, ResponseType>,
    self: {}
  ) {
    const startTime = Date.now();
    function patchedCallback(
      err: grpcTypes.ServiceError,
      // tslint:disable-next-line:no-any
      value: any,
      trailer: grpcTypes.Metadata,
      flags: grpcTypes.writeFlags
    ) {
      if (err) {
        if (err.code) {
          rootSpan.setStatus(
            GrpcPlugin.convertGrpcStatusToSpanStatus(err.code),
            err.message
          );
          rootSpan.addAttribute(
            GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE,
            err.code.toString()
          );
        }
        rootSpan.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_ERROR_NAME, err.name);
        rootSpan.addAttribute(
          GrpcPlugin.ATTRIBUTE_GRPC_ERROR_MESSAGE,
          err.message
        );
      } else {
        rootSpan.setStatus(CanonicalCode.OK);
        rootSpan.addAttribute(
          GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE,
          grpcTypes.status.OK.toString()
        );
      }
      rootSpan.addMessageEvent(MessageEventType.RECEIVED, 1);

      // record stats
      const parentTagCtx =
        GrpcPlugin.getTagContext(call.metadata) || new TagMap();
      parentTagCtx.set(
        serverStats.GRPC_SERVER_METHOD,
        { value: rootSpan.name },
        UNLIMITED_PROPAGATION_MD
      );
      const req = call.hasOwnProperty('request') ? call.request : {};
      GrpcPlugin.recordStats(
        rootSpan.kind,
        parentTagCtx,
        value,
        req,
        Date.now() - startTime
      );

      rootSpan.end();
      return callback(err, value, trailer, flags);
    }

    plugin.tracer.wrapEmitter(call);
    return original.call(self, call, patchedCallback);
  }

  /**
   * Handler Server Stream and Bidirectional Stream Calls
   */
  private serverStreamAndBidiHandler<RequestType, ResponseType>(
    plugin: GrpcPlugin,
    rootSpan: Span,
    call: ServerCallWithMeta,
    original: grpcTypes.handleCall<RequestType, ResponseType>,
    self: {}
  ) {
    let spanEnded = false;
    const endSpan = () => {
      if (!spanEnded) {
        spanEnded = true;
        rootSpan.end();
      }
    };

    plugin.tracer.wrapEmitter(call);
    call.on('finish', () => {
      rootSpan.setStatus(
        GrpcPlugin.convertGrpcStatusToSpanStatus(call.status.code)
      );
      rootSpan.addAttribute(
        GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE,
        call.status.code.toString()
      );
      // if there is an error, span is ended on error event, otherwise here
      if (call.status.code === 0) {
        endSpan();
      }
    });

    call.on('error', (err: grpcTypes.ServiceError) => {
      rootSpan.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_ERROR_NAME, err.name);
      rootSpan.addAttribute(
        GrpcPlugin.ATTRIBUTE_GRPC_ERROR_MESSAGE,
        err.message
      );
      endSpan();
    });

    return original.call(self, call);
  }

  /**
   * Returns a function that patches the gRPC makeClientConstructor in order
   * to patch all client methods.
   * @returns  function that returns a patch for makeClientConstructor.
   */
  private getPatchClient() {
    const plugin = this;
    return (original: MakeClientConstructor) => {
      plugin.logger.debug('patchClient');
      return function makeClientConstructor<ImplementationType>(
        this: typeof grpcTypes.Client,
        methods: grpcTypes.ServiceDefinition<ImplementationType>,
        serviceName: string,
        options: grpcTypes.GenericClientOptions
      ) {
        const client = original.apply(this, arguments);
        shimmer.massWrap(
          client.prototype,
          Object.keys(methods) as never[],
          plugin.getPatchedClientMethods()
        );
        return client;
      };
    };
  }

  /**
   * This function starts a span (child or root) immediately before the
   * client method is invoked, and ends it either in a callback or stream
   * event handler, depending on the method type.
   */
  private getPatchedClientMethods() {
    const plugin = this;
    // tslint:disable-next-line:no-any
    return (original: GrpcClientFunc) => {
      plugin.logger.debug('patchAllClientsMethods');
      return function clientMethodTrace(this: grpcTypes.Client) {
        const traceOptions = {
          name: `grpc.${original.path.replace('/', '')}`,
          kind: SpanKind.CLIENT,
        };
        const args = Array.prototype.slice.call(arguments);
        // Checks if this remote function call is part of an operation by
        // checking if there is a current root span, if so, we create a child
        // span. In case there is no root span, this means that the remote
        // function call is the first operation, therefore we create a root
        // span.
        if (!plugin.tracer.currentRootSpan) {
          return plugin.tracer.startRootSpan(
            traceOptions,
            plugin.makeGrpcClientRemoteCall(original, args, this, plugin)
          );
        } else {
          const span = plugin.tracer.startChildSpan({
            name: traceOptions.name,
            kind: traceOptions.kind,
          });
          return plugin.makeGrpcClientRemoteCall(original, args, this, plugin)(
            span
          );
        }
      };
    };
  }

  /**
   * This method handels the client remote call
   */
  private makeGrpcClientRemoteCall(
    original: GrpcClientFunc,
    // tslint:disable-next-line:no-any
    args: any[],
    self: grpcTypes.Client,
    plugin: GrpcPlugin
  ) {
    const startTime = Date.now();
    const originalArgs = args;
    /**
     * Patches a callback so that the current span for this trace is also ended
     * when the callback is invoked.
     */
    function patchedCallback(
      span: Span,
      callback: SendUnaryDataCallback,
      metadata: grpcTypes.Metadata
    ) {
      // tslint:disable-next-line:no-any
      const wrappedFn = (err: grpcTypes.ServiceError, res: any) => {
        if (err) {
          if (err.code) {
            span.setStatus(
              GrpcPlugin.convertGrpcStatusToSpanStatus(err.code),
              err.message
            );
            span.addAttribute(
              GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE,
              err.code.toString()
            );
          }
          span.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_ERROR_NAME, err.name);
          span.addAttribute(
            GrpcPlugin.ATTRIBUTE_GRPC_ERROR_MESSAGE,
            err.message
          );
        } else {
          span.setStatus(CanonicalCode.OK);
          span.addAttribute(
            GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE,
            grpcTypes.status.OK.toString()
          );
        }
        span.addMessageEvent(MessageEventType.SENT, 1);

        // record stats: new RPCs on client-side inherit the tag context from
        // the current Context.
        const parentTagCtx = plugin.stats
          ? plugin.stats.getCurrentTagContext()
          : new TagMap();
        if (parentTagCtx.tags.size > 0) {
          GrpcPlugin.setTagContext(metadata, parentTagCtx);
        }
        parentTagCtx.set(
          clientStats.GRPC_CLIENT_METHOD,
          { value: span.name },
          UNLIMITED_PROPAGATION_MD
        );
        GrpcPlugin.recordStats(
          span.kind,
          parentTagCtx,
          originalArgs,
          res,
          Date.now() - startTime
        );

        span.end();
        callback(err, res);
      };
      return plugin.tracer.wrap(wrappedFn);
    }

    return (span: Span) => {
      if (!span) {
        return original.apply(self, args);
      }

      const metadata = GrpcPlugin.getMetadata(original, args);
      // if unary or clientStream
      if (!original.responseStream) {
        const callbackFuncIndex = findIndex(args, arg => {
          return typeof arg === 'function';
        });
        if (callbackFuncIndex !== -1) {
          args[callbackFuncIndex] = patchedCallback(
            span,
            args[callbackFuncIndex],
            metadata
          );
        }
      }

      GrpcPlugin.setSpanContext(metadata, span.spanContext);

      span.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_METHOD, original.path);
      span.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_KIND, span.kind);

      const call = original.apply(self, args);
      plugin.tracer.wrapEmitter(call);

      // if server stream or bidi
      if (original.responseStream) {
        // Both error and status events can be emitted
        // the first one emitted set spanEnded to true
        let spanEnded = false;
        call.on('error', (err: grpcTypes.ServiceError) => {
          // span.status = plugin.traceStatus(err.code);
          span.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_ERROR_NAME, err.name);
          span.addAttribute(
            GrpcPlugin.ATTRIBUTE_GRPC_ERROR_MESSAGE,
            err.message
          );
          if (!spanEnded) {
            span.end();
            spanEnded = true;
          }
        });

        call.on('status', (status: Status) => {
          span.setStatus(GrpcPlugin.convertGrpcStatusToSpanStatus(status.code));
          span.addAttribute(
            GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE,
            status.code.toString()
          );

          if (!spanEnded) {
            span.end();
            spanEnded = true;
          }
        });
      }
      return call;
    };
  }

  /**
   * Gets a metadata from args, creates a new one if not found.
   *
   * This mutates the `args` array when there is no metadata or when there is
   * a nullish metadata positional argument. After this function is executed
   * it is guaranteed that `args` will have a metadata argument.
   *
   *  Code snippet inspired by:
   *  https://github.com/GoogleCloudPlatform/cloud-trace-nodejs/blob/src/plugins/plugin-grpc.ts#L96)
   */
  static getMetadata(
    original: GrpcClientFunc,
    // tslint:disable-next-line:no-any
    args: any[]
  ): grpcTypes.Metadata {
    let [metadata, metadataIndex] = getMetadataAndIndex(original, args);

    if (metadata == null) {
      metadata = new Metadata() as grpcTypes.Metadata;

      if (metadataIndex === -1) {
        // there is no argument for metadata, insert one
        if (!original.requestStream) {
          // unary or server stream
          if (args.length === 0) {
            // No argument (for the gRPC call) was provided, so we will have to
            // provide one, since metadata cannot be the first argument.
            // The internal representation of argument defaults to undefined
            // in its non-presence.
            // Note that we can't pass null instead of undefined because the
            // serializer within gRPC doesn't accept it.
            args.push(undefined);
          }
          metadataIndex = 1;
        } else {
          // client stream or bidi
          metadataIndex = 0;
        }
        args.splice(metadataIndex, 0, metadata);
      } else {
        // null metadata provided, replace
        args[metadataIndex] = metadata;
      }
    }
    return metadata;
  }

  /**
   * Convert Grpc Status to Span Status
   *
   * At this current version of Opencensus Specs they are the same.
   */
  static convertGrpcStatusToSpanStatus(statusCode: grpcTypes.status): number {
    return statusCode;
  }

  /**
   * Returns a span context on a Metadata object if it exists and is
   * well-formed, or null otherwise.
   * @param metadata The Metadata object from which span context should be
   *     retrieved.
   */
  static getSpanContext(metadata: grpcTypes.Metadata): SpanContext | null {
    const metadataValue = metadata.getMap()[GRPC_TRACE_KEY] as Buffer;
    // Entry doesn't exist.
    if (!metadataValue) {
      return null;
    }
    const spanContext = deserializeSpanContext(metadataValue);
    // Value is malformed.
    if (!spanContext) {
      return null;
    }
    return spanContext;
  }

  /**
   * Sets a span context on a Metadata object if it exists.
   * @param metadata The Metadata object to which a span context should be
   *     added.
   * @param spanContext The span context.
   */
  static setSpanContext(
    metadata: grpcTypes.Metadata,
    spanContext: SpanContext
  ): void {
    const serializedSpanContext = serializeSpanContext(spanContext);
    if (serializedSpanContext) {
      metadata.set(GRPC_TRACE_KEY, serializedSpanContext);
    }
  }

  /**
   * Returns a TagMap on a Metadata object if it exists and is well-formed, or
   * null otherwise.
   * @param metadata The Metadata object from which TagMap should be retrieved.
   */
  static getTagContext(metadata: grpcTypes.Metadata): TagMap | null {
    const metadataValue = metadata.getMap()[GRPC_TAGS_KEY] as Buffer;
    // Entry doesn't exist.
    if (!metadataValue) return null;
    try {
      const tags = deserializeBinary(metadataValue);
      // Value is malformed.
      if (!tags) return null;
      return tags;
    } catch (ignore) {
      return null;
    }
  }

  /**
   * Sets a TagMap context on a Metadata object if it exists.
   * @param metadata The Metadata object to which a TagMap should be added.
   * @param TagMap The TagMap.
   */
  static setTagContext(metadata: grpcTypes.Metadata, tagMap: TagMap): void {
    const serializedTagMap = serializeBinary(tagMap);
    if (serializedTagMap) {
      metadata.set(GRPC_TAGS_KEY, serializedTagMap);
    }
  }

  /** Method to record stats for client and server. */
  static recordStats(
    kind: SpanKind,
    tags: TagMap,
    argsOrValue: {},
    reqOrRes: {},
    ms: number
  ) {
    if (!plugin.stats) {
      return;
    }

    try {
      const measureList = [];
      switch (kind) {
        case SpanKind.CLIENT:
          measureList.push({
            measure: clientStats.GRPC_CLIENT_SENT_BYTES_PER_RPC,
            value: sizeof(argsOrValue),
          });
          measureList.push({
            measure: clientStats.GRPC_CLIENT_RECEIVED_BYTES_PER_RPC,
            value: sizeof(reqOrRes),
          });
          measureList.push({
            measure: clientStats.GRPC_CLIENT_RECEIVED_MESSAGES_PER_RPC,
            value: 1,
          });
          measureList.push({
            measure: clientStats.GRPC_CLIENT_SENT_MESSAGES_PER_RPC,
            value: 1,
          });
          measureList.push({
            measure: clientStats.GRPC_CLIENT_ROUNDTRIP_LATENCY,
            value: ms,
          });
          break;
        case SpanKind.SERVER:
          measureList.push({
            measure: serverStats.GRPC_SERVER_RECEIVED_BYTES_PER_RPC,
            value: sizeof(reqOrRes),
          });
          measureList.push({
            measure: serverStats.GRPC_SERVER_RECEIVED_MESSAGES_PER_RPC,
            value: 1,
          });
          measureList.push({
            measure: serverStats.GRPC_SERVER_SENT_BYTES_PER_RPC,
            value: sizeof(argsOrValue),
          });
          measureList.push({
            measure: serverStats.GRPC_SERVER_SENT_MESSAGES_PER_RPC,
            value: 1,
          });
          measureList.push({
            measure: serverStats.GRPC_SERVER_SERVER_LATENCY,
            value: ms,
          });
          break;
        default:
          break;
      }
      plugin.stats.record(measureList, tags);
    } catch (ignore) {}
  }
}

const plugin = new GrpcPlugin();
export { plugin };

// tslint:disable-next-line:no-any
function isMetadata(arg: any): arg is grpcTypes.Metadata {
  return arg instanceof Metadata;
}

/**
 * Get the positional metadata argument and its index.
 *
 * The index can only be -1 (not found), 0 or 1.
 */
function getMetadataAndIndex(
  clientFn: GrpcClientFunc,
  // tslint:disable-next-line:no-any
  args: any[]
): [grpcTypes.Metadata | null | undefined, -1 | 0 | 1] {
  let metadataIndex: -1 | 0 | 1 = -1;

  // get metadata index
  // when in doubt we assume it is an "options" argument
  if (!clientFn.requestStream && !clientFn.responseStream) {
    // unary call: [argument [, metadata] [, options], callback]
    if (args.length > 3) {
      // [argument, metadata, options, callback]
      metadataIndex = 1;
    } else if (args.length === 3 && isMetadata(args[1])) {
      // [argument, metadata, callback]
      metadataIndex = 1;
    }
  } else if (!clientFn.requestStream && clientFn.responseStream) {
    // server stream: [argument [, metadata] [, options]]
    if (args.length > 2) {
      metadataIndex = 1;
    } else if (args.length === 2 && isMetadata(args[1])) {
      metadataIndex = 1;
    }
  } else if (clientFn.requestStream && !clientFn.responseStream) {
    // client stream: [[, metadata] [, options], callback]
    if (args.length > 2) {
      metadataIndex = 0;
    } else if (args.length === 2 && isMetadata(args[0])) {
      metadataIndex = 0;
    }
  } else {
    // bidi: [[, metadata] [, options]]
    if (args.length > 1) {
      metadataIndex = 0;
    } else if (args.length === 1 && isMetadata(args[0])) {
      metadataIndex = 0;
    }
  }

  // even when metadataIndex != -1 the metadata can be nullish
  // a user provided metadata argument can be null or undefined
  return metadataIndex === -1
    ? [undefined, metadataIndex]
    : [args[metadataIndex], metadataIndex];
}
