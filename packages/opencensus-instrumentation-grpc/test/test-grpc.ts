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

import {CoreTracerCls, globalStats, Measurement, Span, SpanEventListener, SpanKind, StatsEventListener, TagKey, TagMap, TagValue, View} from '@opencensus/core';
import {logger} from '@opencensus/core';
import * as assert from 'assert';
import * as grpcModule from 'grpc';
import * as path from 'path';
import {GRPC_TAGS_KEY, GRPC_TRACE_KEY, GrpcModule, GrpcPlugin, plugin, SendUnaryDataCallback} from '../src/';
import * as clientStats from '../src/grpc-stats/client-stats';
import * as serverStats from '../src/grpc-stats/server-stats';
import {registerAllGrpcViews} from '../src/grpc-stats/stats-common';

const PROTO_PATH = __dirname + '/fixtures/grpc-instrumentation-test.proto';
const grpcPort = 50051;
const MAX_ERROR_STATUS = grpcModule.status.UNAUTHENTICATED;
const log = logger.logger();

class TestExporter implements StatsEventListener {
  registeredViews: View[] = [];
  recordedMeasurements: Measurement[] = [];

  onRegisterView(view: View) {
    this.registeredViews.push(view);
  }

  onRecord(
      views: View[], measurement: Measurement, tagMap: Map<TagKey, TagValue>) {
    this.recordedMeasurements.push(measurement);
  }

  start(): void {}
  stop(): void {}

  clean() {
    this.registeredViews = [];
    this.recordedMeasurements = [];
  }
}

const replicate = (request: TestRequestResponse) => {
  const result: TestRequestResponse[] = [];
  for (let i = 0; i < request.num; i++) {
    result.push(request);
  }
  return result;
};

// tslint:disable-next-line:no-any
function startServer(grpc: GrpcModule, proto: any) {
  const server = new grpc.Server();


  function getError(msg: string, code: number): grpcModule.ServiceError {
    const err: grpcModule.ServiceError = new Error(msg);
    err.name = msg;
    err.message = msg;
    err.code = code;
    return err;
  }

  server.addService(proto.GrpcTester.service, {
    // An error is emited every time
    // request.num <= MAX_ERROR_STATUS = (status.UNAUTHENTICATED)
    // in those cases, erro.code = request.num

    // This method returns the request
    unaryMethod(
        // tslint:disable-next-line:no-any
        call: grpcModule.ServerUnaryCall<any>,
        callback: SendUnaryDataCallback) {
      (call.request.num <= MAX_ERROR_STATUS) ?
          callback(getError('Unary Method Error', call.request.num)) :
          callback(null, {num: call.request.num});
    },

    // This method sum the requests
    clientStreamMethod(
        // tslint:disable-next-line:no-any
        call: grpcModule.ServerReadableStream<any>,
        callback: SendUnaryDataCallback) {
      let sum = 0;
      let hasError = false;
      let code = grpcModule.status.OK;
      call.on('data', (data: TestRequestResponse) => {
        sum += data.num;
        if (data.num <= MAX_ERROR_STATUS) {
          hasError = true;
          code = data.num;
        }
      });
      call.on('end', () => {
        hasError ? callback(getError('Client Stream Method Error', code)) :
                   callback(null, {num: sum});
      });
    },

    // This method returns an array that replicates the request, request.num of
    // times
    // tslint:disable-next-line:no-any
    serverStreamMethod: (call: grpcModule.ServerWriteableStream<any>) => {
      const result = replicate(call.request);

      if (call.request.num <= MAX_ERROR_STATUS) {
        call.emit(
            'error', getError('Server Stream Method Error', call.request.num));
      } else {
        result.map((element) => {
          call.write(element);
        });
      }
      call.end();
    },

    // This method returns the request
    // tslint:disable-next-line:no-any
    bidiStreamMethod: (call: grpcModule.ServerDuplexStream<any, any>) => {
      call.on('data', (data: TestRequestResponse) => {
        if (data.num <= MAX_ERROR_STATUS) {
          call.emit('error', getError('Server Stream Method Error', data.num));
        } else {
          call.write(data);
        }
      });
      call.on('end', () => {
        call.end();
      });
    }
  });
  server.bind('localhost:' + grpcPort, grpc.ServerCredentials.createInsecure());
  server.start();
  return server;
}

// tslint:disable-next-line:no-any
function createClient(grpc: GrpcModule, proto: any) {
  return new proto.GrpcTester(
      'localhost:' + grpcPort, grpc.credentials.createInsecure());
}


type TestGrpcClient = grpcModule.Client&{
  // tslint:disable-next-line:no-any
  unaryMethod: any;
  // tslint:disable-next-line:no-any
  clientStreamMethod: any;
  // tslint:disable-next-line:no-any
  serverStreamMethod: any;
  // tslint:disable-next-line:no-any
  bidiStreamMethod: any;
};

type TestRequestResponse = {
  num: number;
};

const grpcClient = {

  unaryMethod: (client: TestGrpcClient, request: TestRequestResponse):
      Promise<TestRequestResponse> => {
        return new Promise((resolve, reject) => {
          return client.unaryMethod(
              request,
              (err: grpcModule.ServiceError, response: TestRequestResponse) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(response);
                }
              });
        });
      },


  clientStreamMethod: (client: TestGrpcClient, request: TestRequestResponse[]):
      Promise<TestRequestResponse> => {
        return new Promise((resolve, reject) => {
          const writeStream = client.clientStreamMethod(
              (err: grpcModule.ServiceError, response: TestRequestResponse) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(response);
                }
              });

          request.forEach(element => {
            writeStream.write(element);
          });
          writeStream.end();
        });
      },

  serverStreamMethod: (client: TestGrpcClient, request: TestRequestResponse):
      Promise<TestRequestResponse[]> => {
        return new Promise((resolve, reject) => {
          const result: TestRequestResponse[] = [];
          const readStream = client.serverStreamMethod(request);

          readStream.on('data', (data: TestRequestResponse) => {
            result.push(data);
          });
          readStream.on('error', (err: grpcModule.ServiceError) => {
            reject(err);
          });
          readStream.on('end', () => {
            resolve(result);
          });
        });
      },


  bidiStreamMethod: (client: TestGrpcClient, request: TestRequestResponse[]):
      Promise<TestRequestResponse[]> => {
        return new Promise((resolve, reject) => {
          const result: TestRequestResponse[] = [];
          const bidiStream = client.bidiStreamMethod([]);

          bidiStream.on('data', (data: TestRequestResponse) => {
            result.push(data);
          });

          request.forEach(element => {
            bidiStream.write(element);
          });

          bidiStream.on('error', (err: grpcModule.ServiceError) => {
            reject(err);
          });

          bidiStream.on('end', () => {
            resolve(result);
          });

          bidiStream.end();
        });
      }
};

class RootSpanVerifier implements SpanEventListener {
  endedRootSpans: Span[] = [];

  onStartSpan(span: Span): void {}
  onEndSpan(root: Span) {
    this.endedRootSpans.push(root);
  }
}


describe('GrpcPlugin() ', function() {
  let server: grpcModule.Server;
  let client: TestGrpcClient;
  const tracer = new CoreTracerCls();
  const rootSpanVerifier = new RootSpanVerifier();
  tracer.start({samplingRate: 1, logger: log});
  const testExporter = new TestExporter();

  it('should return a plugin', () => {
    assert.ok(plugin instanceof GrpcPlugin);
  });

  before(() => {
    const basedir = path.dirname(require.resolve('grpc'));
    const version = require(path.join(basedir, 'package.json')).version;
    plugin.enable(grpcModule, tracer, version, {}, basedir, globalStats);
    tracer.registerSpanEventListener(rootSpanVerifier);
    const proto = grpcModule.load(PROTO_PATH).pkg_test;
    server = startServer(grpcModule, proto);
    client = createClient(grpcModule, proto);
    globalStats.registerExporter(testExporter);
  });

  beforeEach(() => {
    rootSpanVerifier.endedRootSpans = [];
    testExporter.clean();
    registerAllGrpcViews(globalStats);
  });

  after(() => {
    server.forceShutdown();
  });

  const requestList: TestRequestResponse[] = [{num: 100}, {num: 50}];
  const resultSum = {
    num: requestList.reduce(
        (sum, x) => {
          return sum + x.num;
        },
        0)
  };
  const methodList = [
    {
      description: 'unary call',
      methodName: 'UnaryMethod',
      method: grpcClient.unaryMethod,
      request: requestList[0],
      result: requestList[0]
    },
    {
      description: 'clientStream call',
      methodName: 'ClientStreamMethod',
      method: grpcClient.clientStreamMethod,
      request: requestList,
      result: resultSum
    },
    {
      description: 'serverStream call',
      methodName: 'ServerStreamMethod',
      method: grpcClient.serverStreamMethod,
      request: resultSum,
      result: replicate(resultSum)
    },
    {
      description: 'bidiStream call',
      methodName: 'BidiStreamMethod',
      method: grpcClient.bidiStreamMethod,
      request: requestList,
      result: requestList
    }
  ];

  // Compare two arrays using an equal function f
  // tslint:disable-next-line:no-any
  const arrayIsEqual = (f: any) => ([x, ...xs]) => ([y, ...ys]): any =>
      x === undefined && y === undefined ?
      true :
      Boolean(f(x)(y)) && arrayIsEqual(f)(xs)(ys);

  // Return true if two requests has the same num value
  const requestEqual = (x: TestRequestResponse) => (y: TestRequestResponse) =>
      x.num !== undefined && x.num === y.num;

  // Check if its equal requests or array of requests
  const checkEqual = (x: TestRequestResponse|TestRequestResponse[]) =>
      (y: TestRequestResponse|TestRequestResponse[]) =>
          (x instanceof Array) && (y instanceof Array) ?
      (arrayIsEqual(requestEqual)(x)(y)) :
      !(x instanceof Array) && !(y instanceof Array) ? (requestEqual(x)(y)) :
                                                       false;

  function assertSpan(
      span: Span, spanName: string, kind: SpanKind, status: grpcModule.status) {
    assert.strictEqual(span.name, spanName);
    assert.strictEqual(span.kind, kind);
    assert.strictEqual(
        span.status.code, GrpcPlugin.convertGrpcStatusToSpanStatus(status));
    assert.strictEqual(span.attributes[GrpcPlugin.ATTRIBUTE_GRPC_KIND], kind);
    assert.strictEqual(
        span.attributes[GrpcPlugin.ATTRIBUTE_GRPC_STATUS_CODE], `${status}`);
    assert.ok(span.attributes[GrpcPlugin.ATTRIBUTE_GRPC_METHOD]);
    if (status !== grpcModule.status.OK) {
      assert.ok(span.attributes[GrpcPlugin.ATTRIBUTE_GRPC_ERROR_NAME]);
      assert.ok(span.attributes[GrpcPlugin.ATTRIBUTE_GRPC_ERROR_MESSAGE]);
    } else {
      assert.equal(span.status.message, undefined);
    }
  }

  function assertStats(testExporter: TestExporter, sentBytes: number) {
    assert.equal(testExporter.registeredViews.length, 12);
    assert.equal(testExporter.recordedMeasurements.length, 10);
    assert.strictEqual(
        testExporter.recordedMeasurements[0].measure,
        serverStats.GRPC_SERVER_RECEIVED_BYTES_PER_RPC);
    assert.equal(testExporter.recordedMeasurements[0].value, 14);
    assert.deepStrictEqual(
        testExporter.recordedMeasurements[1],
        {measure: serverStats.GRPC_SERVER_RECEIVED_MESSAGES_PER_RPC, value: 1});
    assert.strictEqual(
        testExporter.recordedMeasurements[2].measure,
        serverStats.GRPC_SERVER_SENT_BYTES_PER_RPC);
    assert.equal(testExporter.recordedMeasurements[2].value, 14);
    assert.deepStrictEqual(
        testExporter.recordedMeasurements[3],
        {measure: serverStats.GRPC_SERVER_SENT_MESSAGES_PER_RPC, value: 1});
    assert.strictEqual(
        testExporter.recordedMeasurements[4].measure,
        serverStats.GRPC_SERVER_SERVER_LATENCY);

    assert.strictEqual(
        testExporter.recordedMeasurements[5].measure,
        clientStats.GRPC_CLIENT_SENT_BYTES_PER_RPC);
    assert.equal(testExporter.recordedMeasurements[5].value, sentBytes);
    assert.strictEqual(
        testExporter.recordedMeasurements[6].measure,
        clientStats.GRPC_CLIENT_RECEIVED_BYTES_PER_RPC);
    assert.equal(testExporter.recordedMeasurements[6].value, 14);
    assert.deepStrictEqual(
        testExporter.recordedMeasurements[7],
        {measure: clientStats.GRPC_CLIENT_RECEIVED_MESSAGES_PER_RPC, value: 1});
    assert.deepStrictEqual(
        testExporter.recordedMeasurements[8],
        {measure: clientStats.GRPC_CLIENT_SENT_MESSAGES_PER_RPC, value: 1});
    assert.strictEqual(
        testExporter.recordedMeasurements[9].measure,
        clientStats.GRPC_CLIENT_ROUNDTRIP_LATENCY);
    assert.ok(testExporter.recordedMeasurements[9].value > 0);
  }

  // Check if sourceSpan was propagated to targetSpan
  function assertPropagation(sourceSpan: Span, targetSpan: Span) {
    assert.strictEqual(targetSpan.traceId, sourceSpan.traceId);
    assert.strictEqual(targetSpan.parentSpanId, sourceSpan.id);
    assert.strictEqual(
        targetSpan.spanContext.options, sourceSpan.spanContext.options);
    assert.notStrictEqual(targetSpan.id, sourceSpan.id);
  }

  methodList.map((method) => {
    describe(
        `Test automatic tracing for grpc remote method ${method.description}`,
        () => {
          it(`should create a rootSpan for client and for server - ${
                 method.description}`,
             async () => {
               assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
               const spanName = `grpc.pkg_test.GrpcTester/${method.methodName}`;
               const args = [client, method.request];
               await method.method.apply(this, args)
                   .then(
                       (result: TestRequestResponse|TestRequestResponse[]) => {
                         assert.ok(checkEqual(result)(method.result));
                         assert.strictEqual(
                             rootSpanVerifier.endedRootSpans.length, 2);

                         const serverRoot = rootSpanVerifier.endedRootSpans[0];
                         const clientRoot = rootSpanVerifier.endedRootSpans[1];
                         assertSpan(
                             serverRoot, spanName, SpanKind.SERVER,
                             grpcModule.status.OK);
                         assertSpan(
                             clientRoot, spanName, SpanKind.CLIENT,
                             grpcModule.status.OK);
                         if (method.method === grpcClient.unaryMethod) {
                           assertStats(testExporter, 107);
                         }
                         assertPropagation(clientRoot, serverRoot);
                       });
             });

          it(`should create a rootSpan for client and for server with tag context- ${
                 method.description}`,
             () => {
               assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
               const spanName = `grpc.pkg_test.GrpcTester/${method.methodName}`;
               const args = [client, method.request];

               const tags = new TagMap();
               tags.set({name: 'testKey1'}, {value: 'value1'});
               tags.set({name: 'testKey2'}, {value: 'value2'});
               return globalStats.withTagContext(tags, async () => {
                 await method.method.apply(this, args)
                     .then(
                         (result: TestRequestResponse|
                          TestRequestResponse[]) => {
                           assert.ok(checkEqual(result)(method.result));
                           assert.strictEqual(
                               rootSpanVerifier.endedRootSpans.length, 2);

                           const serverRoot =
                               rootSpanVerifier.endedRootSpans[0];
                           const clientRoot =
                               rootSpanVerifier.endedRootSpans[1];
                           assertSpan(
                               serverRoot, spanName, SpanKind.SERVER,
                               grpcModule.status.OK);
                           assertSpan(
                               clientRoot, spanName, SpanKind.CLIENT,
                               grpcModule.status.OK);
                           if (method.method === grpcClient.unaryMethod) {
                             assertStats(testExporter, 170);
                           }
                           assertPropagation(clientRoot, serverRoot);
                           assert.deepEqual(
                               globalStats.getCurrentTagContext(), tags);
                         });
               });
             });

          it(`should create a childSpan for client and rootSpan for server -  ${
                 method.description}`,
             () => {
               assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
               const options = {name: 'TestRootSpan'};
               const spanName = `grpc.pkg_test.GrpcTester/${method.methodName}`;
               let serverRoot: Span;
               return tracer.startRootSpan(options, async (root: Span) => {
                 assert.strictEqual(root.name, options.name);
                 const args = [client, method.request];
                 await method.method.apply(this, args)
                     .then(
                         (result: TestRequestResponse|
                          TestRequestResponse[]) => {
                           assert.ok(checkEqual(result)(method.result));
                           assert.strictEqual(
                               rootSpanVerifier.endedRootSpans.length, 1);

                           serverRoot = rootSpanVerifier.endedRootSpans[0];
                           assertSpan(
                               serverRoot, spanName, SpanKind.SERVER,
                               grpcModule.status.OK);
                         });
                 root.end();
                 assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 2);
                 const clientChild =
                     rootSpanVerifier.endedRootSpans[1].spans[0];
                 assertSpan(
                     clientChild, spanName, SpanKind.CLIENT,
                     grpcModule.status.OK);
                 // propagation
                 assertPropagation(clientChild, serverRoot);
               });
             });

          it(`should create a childSpan for client and rootSpan for server with tag context -  ${
                 method.description}`,
             () => {
               assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
               const options = {name: 'TestRootSpan'};
               const spanName = `grpc.pkg_test.GrpcTester/${method.methodName}`;
               let serverRoot: Span;
               const tags = new TagMap();
               tags.set({name: 'testKey1'}, {value: 'value1'});
               tags.set({name: 'testKey2'}, {value: 'value2'});
               return globalStats.withTagContext(tags, async () => {
                 return tracer.startRootSpan(options, async (root: Span) => {
                   assert.strictEqual(root.name, options.name);
                   const args = [client, method.request];
                   await method.method.apply(this, args)
                       .then(
                           (result: TestRequestResponse|
                            TestRequestResponse[]) => {
                             assert.ok(checkEqual(result)(method.result));
                             assert.strictEqual(
                                 rootSpanVerifier.endedRootSpans.length, 1);

                             serverRoot = rootSpanVerifier.endedRootSpans[0];
                             assertSpan(
                                 serverRoot, spanName, SpanKind.SERVER,
                                 grpcModule.status.OK);
                           });
                   root.end();
                   assert.strictEqual(
                       rootSpanVerifier.endedRootSpans.length, 2);
                   const clientChild =
                       rootSpanVerifier.endedRootSpans[1].spans[0];
                   assertSpan(
                       clientChild, spanName, SpanKind.CLIENT,
                       grpcModule.status.OK);
                   // propagation
                   assertPropagation(clientChild, serverRoot);
                   assert.deepEqual(globalStats.getCurrentTagContext(), tags);
                 });
               });
             });
        });
  });


  // Returns a request with an error code (value <= 16 (Max Grpc Status Code))
  // inserted
  const insertError = (request: TestRequestResponse|TestRequestResponse[]) =>
      (code: number) => (request instanceof Array) ?
      request.splice(0, 0, {num: code}) && request.slice(0, request.length) :
      {num: code};


  methodList.map((method) => {
    describe(`Test error raising for grpc remote ${method.description}`, () => {
      // Iterate over all error status code
      Object.keys(grpcModule.status).map((key: string) => {
        // tslint:disable-next-line:no-any
        const errorCode = Number(grpcModule.status[key as any]);
        if (errorCode > grpcModule.status.OK) {
          it(`should raise an error for client/server rootSpans - ${
                 method.description} - status = ${key}`,
             async () => {
               assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
               const spanName = `grpc.pkg_test.GrpcTester/${method.methodName}`;
               const errRequest = (method.request instanceof Array) ?
                   method.request.slice(0, method.request.length) :
                   method.request;
               const args = [client, insertError(errRequest)(errorCode)];
               await method.method.apply(this, args)
                   .catch((err: grpcModule.ServiceError) => {
                     assert.strictEqual(
                         rootSpanVerifier.endedRootSpans.length, 2);

                     const serverRoot = rootSpanVerifier.endedRootSpans[0];
                     const clientRoot = rootSpanVerifier.endedRootSpans[1];
                     assertSpan(
                         serverRoot, spanName, SpanKind.SERVER, errorCode);
                     assertSpan(
                         clientRoot, spanName, SpanKind.CLIENT, errorCode);
                     assertPropagation(clientRoot, serverRoot);
                   });
             });

          it(`should raise an error for client childSpan/server rootSpan - ${
                 method.description} - status = ${key}`,
             () => {
               assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 0);
               const options = {name: 'TestRootSpan'};
               const spanName = `grpc.pkg_test.GrpcTester/${method.methodName}`;
               let serverRoot: Span;
               return tracer.startRootSpan(options, async (root: Span) => {
                 assert.strictEqual(root.name, options.name);
                 const errRequest = (method.request instanceof Array) ?
                     method.request.slice(0, method.request.length) :
                     method.request;
                 const args = [client, insertError(errRequest)(errorCode)];
                 await method.method.apply(this, args)
                     .catch((err: grpcModule.ServiceError) => {
                       assert.strictEqual(
                           rootSpanVerifier.endedRootSpans.length, 1);

                       serverRoot = rootSpanVerifier.endedRootSpans[0];
                       assertSpan(
                           serverRoot, spanName, SpanKind.SERVER, errorCode);
                     });
                 root.end();
                 assert.strictEqual(rootSpanVerifier.endedRootSpans.length, 2);
                 const clientChild =
                     rootSpanVerifier.endedRootSpans[1].spans[0];
                 assertSpan(clientChild, spanName, SpanKind.CLIENT, errorCode);
                 // propagation
                 assertPropagation(clientChild, serverRoot);
               });
             });
        }
      });
    });
  });
  describe('setSpanContext', () => {
    const metadata = new grpcModule.Metadata();
    const spanContext = {
      traceId: '3ad17e665f514aabb896341f670179ed',
      spanId: '3aaeb440a89d9e82',
      options: 0x1
    };

    it('should set span context', () => {
      GrpcPlugin.setSpanContext(metadata, spanContext);
      const actualSpanContext = GrpcPlugin.getSpanContext(metadata);
      assert.deepEqual(actualSpanContext, spanContext);
    });
  });

  describe('getSpanContext', () => {
    const metadata = new grpcModule.Metadata();
    it('should return null when span context is not set', () => {
      const actualSpanContext = GrpcPlugin.getSpanContext(metadata);
      assert.equal(actualSpanContext, null);
    });

    it('should return valid span context', () => {
      const buffer = Buffer.from([
        0x00, 0x00, 0xdf, 0x6a, 0x20, 0x38, 0xfa, 0x78, 0xc4, 0xcd,
        0x42, 0x20, 0x91, 0x26, 0x24, 0x9c, 0x31, 0xc7, 0x01, 0xc2,
        0xb7, 0xce, 0x7a, 0x57, 0x2a, 0x37, 0xc6, 0x02, 0x01
      ]);
      const expectedSpanContext = {
        traceId: 'df6a2038fa78c4cd42209126249c31c7',
        spanId: 'c2b7ce7a572a37c6',
        options: 1
      };
      metadata.set(GRPC_TRACE_KEY, buffer);
      const actualSpanContext = GrpcPlugin.getSpanContext(metadata);
      assert.deepEqual(actualSpanContext, expectedSpanContext);
    });

    it('should return null for unsupported version', () => {
      const buffer = Buffer.from([
        0x66, 0x64, 0xdf, 0x6a, 0x20, 0x38, 0xfa, 0x78, 0xc4, 0xcd,
        0x42, 0x20, 0x91, 0x26, 0x24, 0x9c, 0x31, 0xc7, 0x01, 0xc2,
        0xb7, 0xce, 0x7a, 0x57, 0x2a, 0x37, 0xc6, 0x02, 0x01
      ]);
      metadata.set(GRPC_TRACE_KEY, buffer);
      const actualSpanContext = GrpcPlugin.getSpanContext(metadata);
      assert.deepEqual(actualSpanContext, null);
    });

    it('should return null when unexpected trace ID offset', () => {
      const buffer = Buffer.from([
        0x00, 0x04, 0xdf, 0x6a, 0x20, 0x38, 0xfa, 0x78, 0xc4, 0xcd,
        0x42, 0x20, 0x91, 0x26, 0x24, 0x9c, 0x31, 0xc7, 0x01, 0xc2,
        0xb7, 0xce, 0x7a, 0x57, 0x2a, 0x37, 0xc6, 0x02, 0x01
      ]);
      metadata.set(GRPC_TRACE_KEY, buffer);
      const actualSpanContext = GrpcPlugin.getSpanContext(metadata);
      assert.deepEqual(actualSpanContext, null);
    });

    it('should return null when unexpected span ID offset', () => {
      const buffer = Buffer.from([
        0x00, 0x00, 0xdf, 0x6a, 0x20, 0x38, 0xfa, 0x78, 0xc4, 0xcd,
        0x42, 0x20, 0x91, 0x26, 0x24, 0x9c, 0x31, 0xc7, 0x03, 0xc2,
        0xb7, 0xce, 0x7a, 0x57, 0x2a, 0x37, 0xc6, 0x02, 0x01
      ]);
      metadata.set(GRPC_TRACE_KEY, buffer);
      const actualSpanContext = GrpcPlugin.getSpanContext(metadata);
      assert.deepEqual(actualSpanContext, null);
    });

    it('should return null when unexpected options offset', () => {
      const buffer = Buffer.from([
        0x00, 0x00, 0xdf, 0x6a, 0x20, 0x38, 0xfa, 0x78, 0xc4, 0xcd,
        0x42, 0x20, 0x91, 0x26, 0x24, 0x9c, 0x31, 0xc7, 0x03, 0xc2,
        0xb7, 0xce, 0x7a, 0x57, 0x2a, 0x37, 0xc6, 0x00, 0x01
      ]);
      metadata.set(GRPC_TRACE_KEY, buffer);
      const actualSpanContext = GrpcPlugin.getSpanContext(metadata);
      assert.deepEqual(actualSpanContext, null);
    });

    it('should return null when invalid input i.e. truncated', () => {
      const buffer =
          Buffer.from([0x00, 0x00, 0xdf, 0x6a, 0x20, 0x38, 0xfa, 0x78, 0xc4]);
      metadata.set(GRPC_TRACE_KEY, buffer);
      const actualSpanContext = GrpcPlugin.getSpanContext(metadata);
      assert.deepEqual(actualSpanContext, null);
    });
  });

  describe('setTagContext', () => {
    const metadata = new grpcModule.Metadata();

    const multipleTagMap = new TagMap();
    multipleTagMap.set({name: 'k1'}, {value: 'v1'});
    multipleTagMap.set({name: 'k2'}, {value: 'v2'});

    it('should set TagMap', () => {
      GrpcPlugin.setTagContext(metadata, multipleTagMap);
      const actualTagMap = GrpcPlugin.getTagContext(metadata);
      assert.equal(actualTagMap!.tags.size, 2);
      assert.deepEqual(actualTagMap!.tags, multipleTagMap.tags);
    });
  });

  describe('getTagContext', () => {
    const metadata = new grpcModule.Metadata();
    it('should return null when TagMap is not set', () => {
      const actualTagMap = GrpcPlugin.getTagContext(metadata);
      assert.equal(actualTagMap, null);
    });

    it('should return valid TagMap', () => {
      const buffer = Buffer.from([
        0x00, 0x00, 0x02, 0x6b, 0x31, 0x02, 0x76, 0x31, 0x00, 0x02, 0x6b, 0x32,
        0x02, 0x76, 0x32
      ]);
      const expectedTags = new TagMap();
      expectedTags.set({name: 'k1'}, {value: 'v1'});
      expectedTags.set({name: 'k2'}, {value: 'v2'});
      metadata.set(GRPC_TAGS_KEY, buffer);
      const actualTagMap = GrpcPlugin.getTagContext(metadata);
      assert.equal(actualTagMap!.tags.size, 2);
      assert.deepEqual(actualTagMap!.tags, expectedTags.tags);
    });

    it('should return null when unexpected tagKey', () => {
      const buffer =
          Buffer.from([0x01, 0x00, 0x02, 0x6b, 0x31, 0x02, 0x76, 0x31]);
      metadata.set(GRPC_TAGS_KEY, buffer);
      const actualTagMap = GrpcPlugin.getTagContext(metadata);
      assert.deepEqual(actualTagMap, null);
    });
  });
});
