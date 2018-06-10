/**
 * Copyright 2018, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      gRPC://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {classes, logger, types} from '@opencensus/opencensus-core';
import {EventEmitter} from 'events';
import * as grpcModule from 'grpc';
import * as lodash from 'lodash';
import * as path from 'path';
import * as semver from 'semver';
import * as shimmer from 'shimmer';


const findIndex = lodash.findIndex;

function requireModule(module: string, nodeName: string) {
  const indexPath = path.dirname(require.resolve(module));
  return require(path.join(indexPath, nodeName));
}
const grpcClient = requireModule('grpc', 'src/client.js');


//
// Types definitions
//
export type GrpcModule = typeof grpcModule;
type MakeClientConstructor = typeof grpcModule.makeGenericClientConstructor;
type RegisterMethod = typeof grpcModule.Server.prototype.register;

type Status = {
  code: number, details: string; metadata: grpcModule.Metadata;
};

type ServerCall = typeof grpcModule.ServerUnaryCall|
                  typeof grpcModule.ServerReadableStream|
                  typeof grpcModule.ServerWriteableStream|
                  typeof grpcModule.ServerDuplexStream;

type ServerCallWithMeta = ServerCall&{
  metadata: grpcModule.Metadata;
  status: Status
}
&EventEmitter;

export type SendUnaryDataCallback =
    (error: grpcModule.ServiceError,
     // tslint:disable-next-line:no-any
     value?: any, trailer?: grpcModule.Metadata,
     flags?: grpcModule.writeFlags) => void;


type HandlerSet = {
  // tslint:disable-next-line:no-any
  func: grpcModule.handleCall<any, any>;
  // tslint:disable-next-line:no-any
  serialize: grpcModule.serialize<any>;
  // tslint:disable-next-line:no-any
  deserialize: grpcModule.deserialize<any>;
  type: string;
};


/** gRPC instrumentation plugin for Opencensus */
export class GrpcPlugin extends classes.BasePlugin {
  /**
   * Span grpc attributes
   */
  static readonly ATTRIBUTE_GRPC_KIND = 'grpc.kind';  // SERVER or CLIENT
  static readonly ATTRIBUTE_GRPC_METHOD = 'grpc.method';
  static readonly ATTRIBUTE_GRPC_STATUS_CODE = 'grpc.status_code';
  static readonly ATTRIBUTE_GRPC_ERROR_NAME = 'grpc.error_name';
  static readonly ATTRIBUTE_GRPC_ERROR_MESSAGE = 'grpc.error_message';

  private logger: types.Logger;

  /** Constructs a new GrpcPlugin instance. */
  constructor() {
    super('grpc');
  }

  /**
   * Patches gRPC incoming and outcoming request functions.
   * @param moduleExports The gRPC module exports
   * @param tracer A tracer instance to create spans on.
   * @param version The package version.
   */
  applyPatch(moduleExports: GrpcModule, tracer: types.Tracer, version: string) {
    this.setPluginContext(moduleExports, tracer, version);
    this.logger = tracer.logger || logger.logger('debug');

    this.logger.debug('applying pacth to %s@%s', this.moduleName, this.version);

    shimmer.wrap(
        moduleExports.Server.prototype, 'register', this.patchServer());
    shimmer.wrap(grpcClient, 'makeClientConstructor', this.patchClient());

    return moduleExports;
  }


  /** Unpatches all gRPC patched function. */
  applyUnpatch(): void {
    shimmer.unwrap(this.moduleExports.Server.prototype, 'register');
    shimmer.unwrap(grpcClient, 'makeClientConstructor');
  }


  /**
   * Returns a function that patches the gRPC server register function in order
   * to create trace spans for gRPC service methods.
   * @returns {Function}  The register patched function.
   */
  private patchServer() {
    return (originalRegister: RegisterMethod) => {
      const plugin = this;
      plugin.logger.debug('pathcServer');
      return function register(
          name: string,
          // tslint:disable-next-line:no-any
          handler: grpcModule.handleCall<any, any>,
          // tslint:disable-next-line:no-any
          serialize: grpcModule.serialize<any>,
          // tslint:disable-next-line:no-any
          deserialize: grpcModule.deserialize<any>, type: string) {
        const result = originalRegister.apply(this, arguments);
        const handlerSet = this.handlers[name];

        // Patch the methods that are invoked when a gRPC service call is
        // made. The function 'func' is the user-implemented handling function.
        shimmer.wrap(
            handlerSet, 'func',
            // tslint:disable-next-line:no-any
            (originalFunc: grpcModule.handleCall<any, any>) => {
              return function func(
                  call: ServerCallWithMeta, callback: SendUnaryDataCallback) {
                const self = this;

                const propagation = plugin.tracer.propagation;
                const headers = call.metadata.getMap();
                const getter: types.HeaderGetter = {
                  getHeader(name: string) {
                    return headers[name] as string;
                  }
                };

                const traceOptions = {
                  name: `grpc.${name.replace('/', '')}`,
                  type: 'SERVER',
                  spanContext: propagation ? propagation.extract(getter) : null
                };
                plugin.logger.debug('path func: %s', traceOptions.name);

                return plugin.tracer.startRootSpan(traceOptions, rootSpan => {
                  if (!rootSpan) {
                    return originalFunc.call(self, call, callback);
                  }

                  rootSpan.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_METHOD, name);
                  rootSpan.addAttribute(
                      GrpcPlugin.ATTRIBUTE_GRPC_KIND, traceOptions.type);

                  switch (type) {
                    case 'unary':
                    case 'client_stream':
                      return plugin.clientStreamAndUnaryHandler(
                          plugin, rootSpan, call, callback, originalFunc, self);
                    case 'server_stream':
                    case 'bidi':
                      return plugin.serverStreamAndBidiHandler(
                          plugin, rootSpan, call, originalFunc, self);
                    default:
                      break;
                  }
                });
              };
            });
        return result;
      };
    };
  }


  /**
   * Handler Unary and Client Stream Calls
   */
  private clientStreamAndUnaryHandler(
      plugin: GrpcPlugin, rootSpan: types.RootSpan, call: ServerCallWithMeta,
      callback: SendUnaryDataCallback,
      // tslint:disable-next-line:no-any
      original: grpcModule.handleCall<any, any>,
      // tslint:disable-next-line:no-any
      self: grpcModule.handleCall<any, any>) {
    function patchedCallback(
        err: grpcModule.ServiceError,
        // tslint:disable-next-line:no-any
        result: any, trailer: grpcModule.Metadata,
        flags: grpcModule.writeFlags) {
      if (err) {
        rootSpan.status = plugin.traceStatus(err.code);
        rootSpan.addAttribute(
            GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE, err.code.toString());
        rootSpan.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_ERROR_NAME, err.name);
        rootSpan.addAttribute(
            GrpcPlugin.ATTRIBUTE_GRPC_ERROR_MESSAGE, err.message);
      } else {
        rootSpan.status = plugin.traceStatus(grpcModule.status.OK);
        rootSpan.addAttribute(
            GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE,
            grpcModule.status.OK.toString());
      }
      rootSpan.end();
      return callback(err, result, trailer, flags);
    }

    plugin.tracer.wrapEmitter(call);
    return original.call(self, call, patchedCallback);
  }

  /**
   * Handler Server Stream and Bidirectional Stream Calls
   */
  private serverStreamAndBidiHandler(
      plugin: GrpcPlugin, rootSpan: types.RootSpan, call: ServerCallWithMeta,
      // tslint:disable-next-line:no-any
      original: grpcModule.handleCall<any, any>,
      // tslint:disable-next-line:no-any
      self: grpcModule.handleCall<any, any>) {
    let spanEnded = false;
    const endSpan = () => {
      if (!spanEnded) {
        spanEnded = true;
        rootSpan.end();
      }
    };

    plugin.tracer.wrapEmitter(call);
    call.on('finish', () => {
      rootSpan.status = plugin.traceStatus(call.status.code);
      rootSpan.addAttribute(
          GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE, call.status.code.toString());
      // if there is an error, span is ended on error event, otherwise here
      if (call.status.code === 0) {
        endSpan();
      }
    });

    call.on('error', (err: grpcModule.ServiceError) => {
      rootSpan.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_ERROR_NAME, err.name);
      rootSpan.addAttribute(
          GrpcPlugin.ATTRIBUTE_GRPC_ERROR_MESSAGE, err.message);
      endSpan();
    });

    return original.call(self, call);
  }

  /**
   * Returns a function that patches the gRPC makeClientConstructor in order
   * to patch all client methods.
   * @returns {Function}  The register patched function.
   */
  private patchClient() {
    const plugin = this;
    return (original: MakeClientConstructor) => {
      plugin.logger.debug('patchClient');
      return function makeClientConstructor(
          // tslint:disable-next-line:no-any
          methods: grpcModule.ServiceDefinition<any>, serviceName: string,
          options: grpcModule.GenericClientOptions) {
        const client = original.apply(this, arguments);
        shimmer.massWrap(
            client.prototype, Object.keys(methods) as never[],
            plugin.patchAllClientsMethods());
        return client;
      };
    };
  }


  /**
   * This function starts a span (child or root) immediately before the
   * client method is invoked, and ends it either in a callback or stream
   * event handler, depending on the method type.
   */
  private patchAllClientsMethods() {
    const plugin = this;
    // tslint:disable-next-line:no-any
    return (original: any) => {
      plugin.logger.debug('patchAllClientsMethods');
      return function clientMethodTrace() {
        const traceOptions = {
          name: `grpc.${original.path.replace('/', '')}`,
          type: 'CLIENT',
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
              plugin.makeGrpcClientRemoteCall(original, args, this, plugin));
        } else {
          const span = plugin.tracer.startChildSpan(
              traceOptions.name, traceOptions.type);
          return (plugin.makeGrpcClientRemoteCall(
              original, args, this, plugin))(span);
        }
      };
    };
  }

  /**
   * This method handels the client remote call
   */
  private makeGrpcClientRemoteCall(
      // tslint:disable-next-line:no-any
      original: any, args: any[], self: any, plugin: GrpcPlugin) {
    /**
     * Patches a callback so that the current span for this trace is also ended
     * when the callback is invoked.
     */
    function patchedCallback(
        span: types.Span,
        // tslint:disable-next-line:no-any
        callback: any) {
      // tslint:disable-next-line:no-any
      const wrappedFn = (err: grpcModule.ServiceError, res: any) => {
        if (err) {
          span.status = plugin.traceStatus(err.code);
          span.addAttribute(
              GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE, err.code.toString());
          span.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_ERROR_NAME, err.name);
          span.addAttribute(
              GrpcPlugin.ATTRIBUTE_GRPC_ERROR_MESSAGE, err.message);
        } else {
          span.status = plugin.traceStatus(grpcModule.status.OK);
          span.addAttribute(
              GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE,
              grpcModule.status.OK.toString());
        }
        span.end();
        callback(err, res);
      };
      return plugin.tracer.wrap(wrappedFn);
    }

    return (span: types.Span) => {
      if (!span) {
        return original.apply(self, args);
      }

      // if unary or clientStream
      if (!original.responseStream) {
        const callbackFuncIndex = findIndex(args, (arg) => {
          return typeof arg === 'function';
        });
        if (callbackFuncIndex !== -1) {
          args[callbackFuncIndex] =
              patchedCallback(span, args[callbackFuncIndex]);
        }
      }

      const metadata = this.getMetadata(original, args, span);

      const setter: types.HeaderSetter = {
        setHeader(name: string, value: string) {
          metadata.set(name, value);
        }
      };

      const propagation = plugin.tracer.propagation;
      if (propagation) {
        propagation.inject(setter, span.spanContext);
      }

      span.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_METHOD, original.path);
      span.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_KIND, span.type);

      const call = original.apply(self, args);

      plugin.tracer.wrapEmitter(call);

      // if server stream or bidi
      if (original.responseStream) {
        let spanEnded = false;
        call.on('error', (err: grpcModule.ServiceError) => {
          // span.status = plugin.traceStatus(err.code);
          span.addAttribute(GrpcPlugin.ATTRIBUTE_GRPC_ERROR_NAME, err.name);
          span.addAttribute(
              GrpcPlugin.ATTRIBUTE_GRPC_ERROR_MESSAGE, err.message);
          if (!spanEnded) {
            span.end();
            spanEnded = true;
          }
        });

        call.on('status', (status: Status) => {
          span.status = plugin.traceStatus(status.code);
          span.addAttribute(
              GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE, status.code.toString());

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
   * Gets a metadata form args, creates a new one if not found.
   *
   *  Code snippet inspired by:
   *  https://github.com/GoogleCloudPlatform/cloud-trace-nodejs/blob/src/plugins/plugin-grpc.ts#L96)
   */
  // tslint:disable-next-line:no-any
  private getMetadata(original: any, args: any[], span: types.Span):
      grpcModule.Metadata {
    let metadata: grpcModule.Metadata;

    // This finds an instance of Metadata among the arguments.
    // A possible issue that could occur is if the 'options' parameter from
    // the user contains an '_internal_repr' as well as a 'getMap' function,
    // but this is an extremely rare case.
    // tslint:disable-next-line:no-any
    let metadataIndex = findIndex(args, (arg: any) => {
      return arg && typeof arg === 'object' && arg._internal_repr &&
          typeof arg.getMap === 'function';
    });
    if (metadataIndex === -1) {
      metadata = new grpcModule.Metadata();
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
      metadata = args[metadataIndex];
    }
    return metadata;
  }

  traceStatus(statusCode: grpcModule.status): number {
    return statusCode;
  }
}

const plugin = new GrpcPlugin();
export {plugin};
