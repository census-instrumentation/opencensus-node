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

import { CoreTracer, logger, Span as OCSpan, version } from '@opencensus/core';
import * as assert from 'assert';
import * as fs from 'fs';
import * as nock from 'nock';

import {
  Span,
  StackdriverExporterOptions,
  StackdriverTraceExporter,
} from '../src/';

import * as nocks from './nocks';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const PROJECT_ID = 'fake-project-id';

describe('Stackdriver Trace Exporter', function() {
  this.timeout(0);

  const testLogger = logger.logger();
  let exporterOptions: StackdriverExporterOptions;
  let exporter: StackdriverTraceExporter;
  let tracer: CoreTracer;

  before(() => {
    nock.disableNetConnect();
    exporterOptions = {
      projectId: PROJECT_ID,
      bufferTimeout: 200,
      logger: testLogger,
    };
  });

  beforeEach(() => {
    nocks.noDetectResource();
    exporter = new StackdriverTraceExporter(exporterOptions);
    tracer = new CoreTracer();
    tracer.start({ samplingRate: 1 });
    tracer.registerSpanEventListener(exporter);
  });

  describe('onEndSpan()', () => {
    it('should add a root span to an exporter buffer', () => {
      const rootSpanOptions = { name: 'sdBufferTestRootSpan' };
      return tracer.startRootSpan(rootSpanOptions, (rootSpan: OCSpan) => {
        assert.strictEqual(exporter.exporterBuffer.getQueue().length, 0);

        const spanName = 'sdBufferTestChildSpan';
        const span = tracer.startChildSpan({ name: spanName });
        span.end();
        rootSpan.end();

        assert.strictEqual(exporter.exporterBuffer.getQueue().length, 1);
        assert.strictEqual(
          exporter.exporterBuffer.getQueue()[0].name,
          rootSpanOptions.name
        );
        assert.strictEqual(
          exporter.exporterBuffer.getQueue()[0].spans.length,
          1
        );
        assert.strictEqual(
          exporter.exporterBuffer.getQueue()[0].spans[0].name,
          spanName
        );
      });
    });
  });

  describe('translateSpan()', () => {
    it('should translate to stackdriver spans', () => {
      return tracer.startRootSpan(
        { name: 'root-test' },
        async (rootSpan: OCSpan) => {
          const span = tracer.startChildSpan({ name: 'spanTest' });
          span.end();
          rootSpan.end();

          const spanList = await exporter.translateSpan([rootSpan]);
          assert.strictEqual(spanList.length, 2);
          assert.deepStrictEqual(spanList, [
            {
              attributes: {
                attributeMap: {
                  'g.co/agent': {
                    stringValue: { value: `opencensus-node [${version}]` },
                  },
                },
                droppedAttributesCount: 0,
              },
              childSpanCount: 1,
              displayName: { value: 'root-test' },
              endTime: rootSpan.endTime.toISOString(),
              links: { droppedLinksCount: 0, link: [] },
              name: `projects/fake-project-id/traces/${rootSpan.traceId}/spans/${rootSpan.id}`,
              sameProcessAsParentSpan: true,
              spanId: rootSpan.id,
              stackTrace: undefined,
              startTime: rootSpan.startTime.toISOString(),
              status: { code: 0 },
              timeEvents: {
                droppedAnnotationsCount: 0,
                droppedMessageEventsCount: 0,
                timeEvent: [],
              },
            },
            {
              attributes: {
                attributeMap: {
                  'g.co/agent': {
                    stringValue: { value: `opencensus-node [${version}]` },
                  },
                },
                droppedAttributesCount: 0,
              },
              childSpanCount: 0,
              displayName: { value: 'spanTest' },
              endTime: span.endTime.toISOString(),
              links: { droppedLinksCount: 0, link: [] },
              name: `projects/fake-project-id/traces/${span.traceId}/spans/${span.id}`,
              parentSpanId: rootSpan.id,
              sameProcessAsParentSpan: true,
              spanId: span.id,
              stackTrace: undefined,
              startTime: span.startTime.toISOString(),
              status: { code: 0 },
              timeEvents: {
                droppedAnnotationsCount: 0,
                droppedMessageEventsCount: 0,
                timeEvent: [],
              },
            },
          ]);
        }
      );
    });
  });

  describe('publish()', () => {
    it('should fail exporting with wrong projectId', () => {
      nock.enableNetConnect();
      const NOEXIST_PROJECT_ID = 'no-existent-project-id-99999';
      process.env.GOOGLE_APPLICATION_CREDENTIALS =
        __dirname + '/fixtures/fakecredentials.json';
      nocks.oauth2(body => true);
      const failExporterOptions = {
        projectId: NOEXIST_PROJECT_ID,
        logger: logger.logger('debug'),
      };
      const failExporter = new StackdriverTraceExporter(failExporterOptions);
      const failTracer = new CoreTracer();
      failTracer.start({ samplingRate: 1 });
      failTracer.registerSpanEventListener(failExporter);
      return failTracer.startRootSpan(
        { name: 'sdNoExportTestRootSpan' },
        async (rootSpan: OCSpan) => {
          const span = failTracer.startChildSpan({
            name: 'sdNoExportTestChildSpan',
          });
          span.end();
          rootSpan.end();

          return failExporter.publish([rootSpan]).then(result => {
            assert.strictEqual(result.code, 401);
            assert.ok(result.message.indexOf('batchWriteSpans error') >= 0);

            assert.strictEqual(
              failExporter.failBuffer[0].traceId,
              rootSpan.spanContext.traceId
            );
          });
        }
      );
    });

    it('should export traces to stackdriver', () => {
      return tracer.startRootSpan(
        { name: 'sdExportTestRootSpan' },
        async (rootSpan: OCSpan) => {
          const span = tracer.startChildSpan({ name: 'sdExportTestChildSpan' });

          nocks.oauth2(body => true);
          nocks.batchWrite(PROJECT_ID, (body: { spans: Span[] }): boolean => {
            assert.strictEqual(body.spans.length, 2);
            const spans = body.spans;
            assert.strictEqual(spans[0].spanId, rootSpan.id);
            assert.strictEqual(spans[1].spanId, span.id);
            return true;
          });
          span.end();
          rootSpan.end();

          return exporter.publish([rootSpan]).then(result => {
            assert.ok(result.indexOf('batchWriteSpans successfully') >= 0);
          });
        }
      );
    });

    it('should fail exporting by network error', async () => {
      nock('https://cloudtrace.googleapis.com')
        .intercept(
          '/v2/projects/' + exporterOptions.projectId + '/traces:batchWrite',
          'post'
        )
        .reply(443, 'Simulated Network Error');

      nocks.oauth2(body => true);

      return tracer.startRootSpan(
        { name: 'sdErrorExportTestRootSpan' },
        (rootSpan: OCSpan) => {
          const span = tracer.startChildSpan({
            name: 'sdErrorExportTestChildSpan',
          });
          span.end();
          rootSpan.end();

          return exporter.publish([rootSpan]).then(result => {
            assert.ok(
              result.message.indexOf(
                'batchWriteSpans error: Simulated Network Error'
              ) >= 0
            );
          });
        }
      );
    });

    describe('with credentials option', () => {
      const FAKE_CREDENTIALS = JSON.parse(
        fs.readFileSync(__dirname + '/fixtures/fakecredentials.json').toString()
      );

      before(() => {
        exporterOptions = {
          projectId: PROJECT_ID,
          bufferTimeout: 200,
          logger: testLogger,
          credentials: FAKE_CREDENTIALS,
        };
      });

      it('should export traces to stackdriver', () => {
        return tracer.startRootSpan(
          { name: 'sdExportTestRootSpan' },
          async (rootSpan: OCSpan) => {
            const span = tracer.startChildSpan({
              name: 'sdExportTestChildSpan',
            });

            nocks.oauth2(body => true);
            nocks.batchWrite(PROJECT_ID, (body: { spans: Span[] }): boolean => {
              assert.strictEqual(body.spans.length, 2);
              const spans = body.spans;
              assert.strictEqual(spans[0].spanId, rootSpan.id);
              assert.strictEqual(spans[1].spanId, span.id);
              return true;
            });
            span.end();
            rootSpan.end();

            return exporter.publish([rootSpan]).then(result => {
              assert.ok(result.indexOf('batchWriteSpans successfully') >= 0);
            });
          }
        );
      });

      it('should fail exporting by network error', async () => {
        nock('https://cloudtrace.googleapis.com')
          .intercept(
            '/v2/projects/' + exporterOptions.projectId + '/traces:batchWrite',
            'post'
          )
          .reply(443, 'Simulated Network Error');

        nocks.oauth2(body => true);

        return tracer.startRootSpan(
          { name: 'sdErrorExportTestRootSpan' },
          (rootSpan: OCSpan) => {
            const span = tracer.startChildSpan({
              name: 'sdErrorExportTestChildSpan',
            });
            span.end();
            rootSpan.end();

            return exporter.publish([rootSpan]).then(result => {
              assert.ok(
                result.message.indexOf(
                  'batchWriteSpans error: Simulated Network Error'
                ) >= 0
              );
            });
          }
        );
      });
    });
  });
});
