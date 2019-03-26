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

import * as protoLoader from '@grpc/proto-loader';
import {CanonicalCode, LinkType, MessageEventType, RootSpan, SpanKind, TraceOptions, Tracing} from '@opencensus/core';
import * as nodeTracing from '@opencensus/nodejs';
import * as assert from 'assert';
import {EventEmitter} from 'events';
import * as grpc from 'grpc';
import * as uuid from 'uuid';
import {OCAgentExporter} from '../src';
import {opencensus} from '../src/types';

// Mock Agent

/**
 * Agent stream types.
 */
type TraceServiceConfigStream = grpc.ServerDuplexStream<
    opencensus.proto.agent.trace.v1.CurrentLibraryConfig,
    opencensus.proto.agent.trace.v1.UpdatedLibraryConfig>;
type TraceServiceExportStream = grpc.ServerDuplexStream<
    opencensus.proto.agent.trace.v1.ExportTraceServiceRequest,
    opencensus.proto.agent.trace.v1.ExportTraceServiceRequest>;

/**
 * Events emitted by the MockAgent.
 */
enum MockAgentEvent {
  ConfigStreamConnected = 'config.connected',
  ExportStreamConnected = 'export.connected',
  ExportStreamMessageReceived = 'export.received',
}

/**
 * Mock implementation of a OpenCensus Agent. Starts a grpc TraceService server
 * on the given `host` and `port`.
 */
class MockAgent extends EventEmitter {
  private server: grpc.Server;
  private configStream: TraceServiceConfigStream|undefined;

  constructor(host: string, port: number) {
    super();

    this.server = new grpc.Server();
    const traceServiceProtoPath =
        'opencensus/proto/agent/trace/v1/trace_service.proto';
    const includeDirs = [
      __dirname + '../../../src/protos',
      __dirname + '../../../node_modules/google-proto-files'
    ];

    // tslint:disable-next-line:no-any
    const proto: any =
        grpc.loadPackageDefinition(protoLoader.loadSync(traceServiceProtoPath, {
          keepCase: false,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
          includeDirs
        }));

    this.server.addService(
        proto.opencensus.proto.agent.trace.v1.TraceService.service, {
          config: (stream: TraceServiceConfigStream) => {
            this.configStream = stream;
            this.emit(MockAgentEvent.ConfigStreamConnected);
          },
          export: (stream: TraceServiceExportStream) => {
            this.emit(MockAgentEvent.ExportStreamConnected);
            stream.on(
                'data',
                (message: opencensus.proto.agent.trace.v1
                     .ExportTraceServiceRequest) => {
                  this.emit(
                      MockAgentEvent.ExportStreamMessageReceived, message);
                });
          }
        });

    this.server.bind(
        `${host}:${port}`, grpc.ServerCredentials.createInsecure());
    this.server.start();
  }

  /**
   * Sends a `ProbabilitySampler` configuration change with the given
   * probability.
   */
  sendConfigurationChangeProbability(probablity: number) {
    if (this.configStream) {
      this.configStream.write(
          {config: {probabilitySampler: {samplingProbability: probablity}}});
    }
  }

  /**
   * Sends a `ConstantSampler` configuration change with the given decision.
   */
  sendConfigurationChangeConstant(decision: boolean) {
    if (this.configStream) {
      this.configStream.write({config: {constantSampler: {decision}}});
    }
  }

  /**
   * Sends a `RateLimitedSampler` configuration change with the given decision.
   */
  sendConfigurationChangeRateLimited(qps: number) {
    if (this.configStream) {
      this.configStream.write({config: {rateLimitingSampler: {qps}}});
    }
  }

  /**
   * Shuts down the server
   */
  stop() {
    this.server.forceShutdown();
  }
}

/**
 * Generate a hex id.
 */
const hexId = (): string => {
  return uuid.v4().split('-').join('');
};

describe('OpenCensus Agent Exporter', () => {
  let server: MockAgent;
  let ocAgentExporter: OCAgentExporter;
  let tracing: Tracing;

  const SERVICE_NAME = 'test-service';
  const INITIAL_SAMPLER_PROBABILITY = 1.0;

  beforeEach(() => {
    const SERVER_HOST = 'localhost';
    const SERVER_PORT = 50052;

    server = new MockAgent(SERVER_HOST, SERVER_PORT);
    ocAgentExporter = new OCAgentExporter({
      serviceName: SERVICE_NAME,
      host: SERVER_HOST,
      port: SERVER_PORT,
      bufferSize: 1,
      bufferTimeout: 0
    });
    tracing = nodeTracing.start({
      exporter: ocAgentExporter,
      samplingRate: INITIAL_SAMPLER_PROBABILITY,
      traceParams: {
        numberOfAttributesPerSpan: 4,
        numberOfLinksPerSpan: 3,
        numberOfAnnontationEventsPerSpan: 2,
        numberOfMessageEventsPerSpan: 3
      }
    });
  });

  afterEach(() => {
    tracing.stop();
    ocAgentExporter.stop();
    server.stop();
  });

  it('should publish spans to agent', (done) => {
    const ROOT_SPAN_NAME = 'root-span';
    const CHILD_SPAN_NAME = 'child-span';

    // Create a rootSpan and one childSpan, then validate that those spans
    // arrived at the server through the grpc stream.
    tracing.tracer.startRootSpan(
        {
          name: ROOT_SPAN_NAME,
          spanContext: {traceId: hexId(), spanId: hexId(), options: 0x1}
        },
        (rootSpan: RootSpan) => {
          const childSpan =
              rootSpan.startChildSpan(CHILD_SPAN_NAME, SpanKind.UNSPECIFIED);

          // When the stream is connected, we end both spans, which should
          // trigger the spans to be sent to the agent.
          server.once(MockAgentEvent.ExportStreamConnected, () => {
            childSpan.end();
            rootSpan.end();
          });

          // When the stream receives data, validate that the two spans we just
          // ended are present.
          server.once(
              MockAgentEvent.ExportStreamMessageReceived,
              (message: opencensus.proto.agent.trace.v1
                   .ExportTraceServiceRequest) => {
                let foundRootSpan = false;
                let foundChildSpan = false;
                message.spans.forEach(span => {
                  if (!span || !span.name) return;

                  switch (span.name.value) {
                    case ROOT_SPAN_NAME: {
                      foundRootSpan = true;
                      break;
                    }
                    case CHILD_SPAN_NAME: {
                      foundChildSpan = true;
                      break;
                    }
                    default: { break; }
                  }
                });
                assert.ok(foundRootSpan, 'could not find root span in message');
                assert.ok(
                    foundChildSpan, 'could not find child span in message');
                done();
              });
        });
  });

  it('should adapt a span correctly', (done) => {
    const rootSpanOptions: TraceOptions = {
      name: 'root',
      kind: SpanKind.SERVER,
      spanContext: {
        traceId: hexId(),
        spanId: hexId(),
        traceState: 'foo=bar,baz=buzz',
        options: 0x1
      }
    };

    tracing.tracer.startRootSpan(rootSpanOptions, (rootSpan: RootSpan) => {
      // Status
      rootSpan.setStatus(CanonicalCode.OK);

      // Attribute
      rootSpan.addAttribute('my_first_attribute', 'foo');
      rootSpan.addAttribute('my_second_attribute', 'foo2');
      rootSpan.addAttribute('my_attribute_string', 'bar2');
      rootSpan.addAttribute('my_first_attribute', 'foo1');
      rootSpan.addAttribute('my_attribute_number', 456);
      rootSpan.addAttribute('my_attribute_boolean', false);

      // Annotation
      rootSpan.addAnnotation(
          'my_annotation', {myString: 'bar', myNumber: 123, myBoolean: true});
      rootSpan.addAnnotation(
          'my_annotation1', {myString: 'bar1', myNumber: 456, myBoolean: true});
      rootSpan.addAnnotation(
          'my_annotation2', {myString: 'bar2', myNumber: 789, myBoolean: true});
      rootSpan.addAnnotation(
          'my_annotation3', {myString: 'bar3', myNumber: 789, myBoolean: true});

      // Message Event
      const timeStamp = 123456789;
      rootSpan.addMessageEvent(MessageEventType.SENT, '1', timeStamp);
      rootSpan.addMessageEvent(MessageEventType.SENT, '2', timeStamp, 100, 12);
      rootSpan.addMessageEvent(MessageEventType.RECEIVED, '1', timeStamp);
      // Use of `null` is to force a `TYPE_UNSPECIFIED` value
      // tslint:disable-next-line:no-any
      rootSpan.addMessageEvent(null as any, '2', timeStamp);

      // Links
      rootSpan.addLink('aaaaa', 'aaa', LinkType.CHILD_LINKED_SPAN);
      rootSpan.addLink('bbbbb', 'bbbbb', LinkType.CHILD_LINKED_SPAN);
      rootSpan.addLink('ffff', 'ffff', LinkType.CHILD_LINKED_SPAN, {
        'child_link_attribute_string': 'foo1',
        'child_link_attribute_number': 123,
        'child_link_attribute_boolean': true,
      });
      rootSpan.addLink('ffff', 'ffff', LinkType.PARENT_LINKED_SPAN);
      // Use of `null` is to force a `TYPE_UNSPECIFIED` value
      // tslint:disable-next-line:no-any
      rootSpan.addLink('ffff', 'ffff', null as any);

      server.on(
          MockAgentEvent.ExportStreamMessageReceived,
          (message:
               opencensus.proto.agent.trace.v1.ExportTraceServiceRequest) => {
            assert.equal(message.spans.length, 1);
            const span = message.spans[0];
            if (!span) {
              assert.fail('span is null or undefined');
              return;
            }

            // Name / Context
            if (!span.name) {
              assert.fail('span.name is null or undefined');
              return;
            }
            assert.equal(span.name.value, 'root');
            assert.equal(span.kind, 'SERVER');

            if (!span.tracestate) {
              assert.fail('span.tracestate is null or undefined');
              return;
            }
            assert.deepEqual(
                span.tracestate.entries,
                [{key: 'foo', value: 'bar'}, {key: 'baz', value: 'buzz'}]);

            if (!span.status) {
              assert.fail('span.status is null or undefined');
            } else {
              assert.deepEqual(span.status, {code: 0, message: ''});
            }

            // Attributes
            if (!span.attributes) {
              assert.fail('span.attributes is null or undefined');
              return;
            }
            assert.deepEqual(span.attributes.attributeMap, {
              my_first_attribute: {
                value: 'stringValue',
                stringValue: {value: 'foo1', truncatedByteCount: 0}
              },
              my_attribute_string: {
                value: 'stringValue',
                stringValue: {value: 'bar2', truncatedByteCount: 0}
              },
              my_attribute_number: {value: 'intValue', intValue: '456'},
              my_attribute_boolean: {value: 'boolValue', boolValue: false}
            });
            assert.equal(span.attributes.droppedAttributesCount, 1);

            // Time Events
            assert.deepEqual(span.timeEvents, {
              droppedAnnotationsCount: 2,
              droppedMessageEventsCount: 1,
              timeEvent: [
                {
                  value: 'annotation',
                  time: null,
                  annotation: {
                    description:
                        {value: 'my_annotation2', truncatedByteCount: 0},
                    attributes: {
                      attributeMap: {
                        myString: {
                          value: 'stringValue',
                          stringValue: {value: 'bar2', truncatedByteCount: 0}
                        },
                        myNumber: {value: 'intValue', intValue: '789'},
                        myBoolean: {value: 'boolValue', boolValue: true}
                      },
                      droppedAttributesCount: 0
                    }
                  },
                },
                {
                  value: 'annotation',
                  time: null,
                  annotation: {
                    description:
                        {value: 'my_annotation3', truncatedByteCount: 0},
                    attributes: {
                      attributeMap: {
                        myString: {
                          value: 'stringValue',
                          stringValue: {value: 'bar3', truncatedByteCount: 0}
                        },
                        myNumber: {value: 'intValue', intValue: '789'},
                        myBoolean: {value: 'boolValue', boolValue: true}
                      },
                      droppedAttributesCount: 0
                    }
                  },
                },
                {
                  messageEvent: {
                    compressedSize: '12',
                    id: '65535',
                    type: 'SENT',
                    uncompressedSize: '100'
                  },
                  time: {seconds: '123456', nanos: 789000000},
                  value: 'messageEvent'
                },
                {
                  value: 'messageEvent',
                  messageEvent: {
                    compressedSize: '0',
                    id: '65535',
                    type: 'RECEIVED',
                    uncompressedSize: '0'
                  },
                  time: {seconds: '123456', nanos: 789000000},
                },
                {
                  value: 'messageEvent',
                  messageEvent: {
                    compressedSize: '0',
                    id: '65535',
                    type: 'TYPE_UNSPECIFIED',
                    uncompressedSize: '0'
                  },
                  time: {seconds: '123456', nanos: 789000000},
                }
              ]
            });

            // Links
            const buff = Buffer.from([255, 255]);
            assert.deepEqual(span.links, {
              droppedLinksCount: 2,
              link: [
                {
                  type: 'CHILD_LINKED_SPAN',
                  traceId: buff,
                  spanId: buff,
                  attributes: {
                    droppedAttributesCount: 0,
                    attributeMap: {
                      child_link_attribute_string: {
                        value: 'stringValue',
                        stringValue: {value: 'foo1', truncatedByteCount: 0}
                      },
                      child_link_attribute_number:
                          {value: 'intValue', intValue: '123'},
                      child_link_attribute_boolean:
                          {value: 'boolValue', boolValue: true}
                    }
                  }
                },
                {
                  type: 'PARENT_LINKED_SPAN',
                  traceId: buff,
                  spanId: buff,
                  attributes:
                      {'attributeMap': {}, 'droppedAttributesCount': 0}
                },
                {
                  type: 'TYPE_UNSPECIFIED',
                  traceId: buff,
                  spanId: buff,
                  attributes:
                      {'attributeMap': {}, 'droppedAttributesCount': 0}
                }
              ]
            });

            done();
          });

      rootSpan.end();
    });
  });

  it('should adapt a span correctly without overflowing trace param limits',
     (done) => {
       const rootSpanOptions: TraceOptions = {
         name: 'root',
         kind: SpanKind.SERVER,
         spanContext: {
           traceId: hexId(),
           spanId: hexId(),
           traceState: 'foo=bar,baz=buzz',
           options: 0x1
         }
       };

       tracing.tracer.startRootSpan(rootSpanOptions, (rootSpan: RootSpan) => {
         // Status
         rootSpan.setStatus(CanonicalCode.OK);

         // Attribute
         rootSpan.addAttribute('my_first_attribute', 'foo');
         rootSpan.addAttribute('my_second_attribute', 'foo2');

         // Annotation
         rootSpan.addAnnotation(
             'my_annotation',
             {myString: 'bar', myNumber: 123, myBoolean: true});

         // Message Event
         const timeStamp = 123456789;
         rootSpan.addMessageEvent(MessageEventType.SENT, '1', timeStamp);
         rootSpan.addMessageEvent(MessageEventType.RECEIVED, '1', timeStamp);

         // Links
         rootSpan.addLink('ffff', 'ffff', LinkType.CHILD_LINKED_SPAN, {
           'child_link_attribute_string': 'foo1',
           'child_link_attribute_number': 123,
           'child_link_attribute_boolean': true,
         });
         rootSpan.addLink('ffff', 'ffff', LinkType.PARENT_LINKED_SPAN);

         server.on(
             MockAgentEvent.ExportStreamMessageReceived,
             (message: opencensus.proto.agent.trace.v1
                  .ExportTraceServiceRequest) => {
               assert.equal(message.spans.length, 1);
               const span = message.spans[0];
               // Name / Context
               if (!span.name) {
                 assert.fail('span.name is null or undefined');
                 return;
               }
               assert.equal(span.name.value, 'root');
               assert.equal(span.kind, 'SERVER');

               if (!span.tracestate) {
                 assert.fail('span.tracestate is null or undefined');
                 return;
               }
               assert.deepEqual(
                   span.tracestate.entries,
                   [{key: 'foo', value: 'bar'}, {key: 'baz', value: 'buzz'}]);

               if (!span.status) {
                 assert.fail('span.status is null or undefined');
               } else {
                 assert.deepEqual(span.status, {code: 0, message: ''});
               }

               // Attributes
               if (!span.attributes) {
                 assert.fail('span.attributes is null or undefined');
                 return;
               }
               assert.deepEqual(span.attributes.attributeMap, {
                 my_first_attribute: {
                   value: 'stringValue',
                   stringValue: {value: 'foo', truncatedByteCount: 0}
                 },
                 my_second_attribute: {
                   value: 'stringValue',
                   stringValue: {value: 'foo2', truncatedByteCount: 0}
                 }
               });
               assert.equal(span.attributes.droppedAttributesCount, 0);

               // Time Events
               assert.deepEqual(span.timeEvents, {
                 droppedAnnotationsCount: 0,
                 droppedMessageEventsCount: 0,
                 timeEvent: [
                   {
                     value: 'annotation',
                     time: null,
                     annotation: {
                       description:
                           {value: 'my_annotation', truncatedByteCount: 0},
                       attributes: {
                         attributeMap: {
                           myString: {
                             value: 'stringValue',
                             stringValue:
                                 {value: 'bar', truncatedByteCount: 0}
                           },
                           myNumber: {value: 'intValue', intValue: '123'},
                           myBoolean: {value: 'boolValue', boolValue: true}
                         },
                         droppedAttributesCount: 0
                       }
                     }
                   },
                   {
                     messageEvent: {
                       compressedSize: '0',
                       id: '65535',
                       type: 'SENT',
                       uncompressedSize: '0'
                     },
                     time: {seconds: '123456', nanos: 789000000},
                     value: 'messageEvent'
                   },
                   {
                     value: 'messageEvent',
                     messageEvent: {
                       compressedSize: '0',
                       id: '65535',
                       type: 'RECEIVED',
                       uncompressedSize: '0'
                     },
                     time: {seconds: '123456', nanos: 789000000},
                   }
                 ]
               });

               // Links
               const buff = Buffer.from([255, 255]);
               assert.deepEqual(span.links, {
                 droppedLinksCount: 0,
                 link: [
                   {
                     type: 'CHILD_LINKED_SPAN',
                     traceId: buff,
                     spanId: buff,
                     attributes: {
                       droppedAttributesCount: 0,
                       attributeMap: {
                         child_link_attribute_string: {
                           value: 'stringValue',
                           stringValue: {value: 'foo1', truncatedByteCount: 0}
                         },
                         child_link_attribute_number:
                             {value: 'intValue', intValue: '123'},
                         child_link_attribute_boolean:
                             {value: 'boolValue', boolValue: true}
                       }
                     }
                   },
                   {
                     type: 'PARENT_LINKED_SPAN',
                     traceId: buff,
                     spanId: buff,
                     attributes:
                         {'attributeMap': {}, 'droppedAttributesCount': 0}
                   }
                 ]
               });

               done();
             });

         rootSpan.end();
       });
     });
});
