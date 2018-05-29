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
import * as assert from 'assert';
import * as fs from 'fs';
import * as mocha from 'mocha';
import * as nock from 'nock';

import {StackdriverExporterOptions, StackdriverTraceExporter} from '../src/';

import * as nocks from './nocks';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
let PROJECT_ID = 'fake-project-id';

function checkEnvironoment(): boolean {
  return false;
}

describe('Stackdriver Exporter', function() {
  this.timeout(0);

  const testLogger = logger.logger();
  let dryrun = true;
  const GOOGLE_APPLICATION_CREDENTIALS =
      process.env.GOOGLE_APPLICATION_CREDENTIALS as string;
  const OPENCENSUS_NETWORK_TESTS =
      process.env.OPENCENSUS_NETWORK_TESTS as string;
  let exporterOptions: StackdriverExporterOptions;
  let exporter: StackdriverTraceExporter;
  let tracer: classes.Tracer;


  before(() => {
    if (GOOGLE_APPLICATION_CREDENTIALS) {
      dryrun = !fs.existsSync(GOOGLE_APPLICATION_CREDENTIALS) &&
          !fs.existsSync(OPENCENSUS_NETWORK_TESTS);
      if (!dryrun) {
        const credentials = require(GOOGLE_APPLICATION_CREDENTIALS);
        PROJECT_ID = credentials.project_id;
        testLogger.debug(
            'GOOGLE_APPLICATION_CREDENTIALS: %s',
            GOOGLE_APPLICATION_CREDENTIALS);
        testLogger.debug('projectId = %s', PROJECT_ID);
      }
    }
    if (dryrun) {
      nock.disableNetConnect();
    }
    testLogger.debug('dryrun=%s', dryrun);
    exporterOptions = {
      projectId: PROJECT_ID,
      bufferTimeout: 200,
      logger: testLogger
    } as StackdriverExporterOptions;
  });

  beforeEach(() => {
    exporter = new StackdriverTraceExporter(exporterOptions);
    tracer = new classes.Tracer();
    tracer.start({samplingRate: 1});
    tracer.registerEndSpanListener(exporter);
    if (!dryrun) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS =
          GOOGLE_APPLICATION_CREDENTIALS;
    }
  });


  /* Should add spans to an exporter buffer */
  describe('onEndSpan()', () => {
    it('should add a root span to an exporter buffer', () => {
      const rootSpanOptions = {name: 'sdBufferTestRootSpan'};
      return tracer.startRootSpan(rootSpanOptions, (rootSpan) => {
        assert.strictEqual(exporter.exporterBuffer.getQueue().length, 0);

        const spanName = 'sdBufferTestChildSpan';
        const span = tracer.startChildSpan(spanName);
        span.end();
        rootSpan.end();

        assert.strictEqual(exporter.exporterBuffer.getQueue().length, 1);
        assert.strictEqual(
            exporter.exporterBuffer.getQueue()[0].name, rootSpanOptions.name);
        assert.strictEqual(
            exporter.exporterBuffer.getQueue()[0].spans.length, 1);
        assert.strictEqual(
            exporter.exporterBuffer.getQueue()[0].spans[0].name, spanName);
      });
    });
  });

  /* Should export spans to stackdriver */
  describe('publish()', () => {
    it('should fail exporting by authentication error', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '';
      if (dryrun) {
        nocks.oauth2((body) => true);
      }

      return tracer.startRootSpan(
          {name: 'sdNoExportTestRootSpan'}, async (rootSpan) => {
            const span = tracer.startChildSpan('sdNoExportTestChildSpan');
            span.end();
            rootSpan.end();

            return exporter.publish([rootSpan]).then((result: string) => {
              assert.ok(result.indexOf('authorize error') >= 0);
              assert.strictEqual(
                  exporter.failBuffer[0].traceId, rootSpan.spanContext.traceId);
            });
          });
    });

    it('should fail exporting with wrong projectId', () => {
      const NOEXIST_PROJECT_ID = 'no-existent-project-id-99999';
      if (dryrun) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS =
            __dirname + '/fixtures/fakecredentials.json';
        nocks.oauth2((body) => true);
        nocks.patchTraces(NOEXIST_PROJECT_ID, null, null, false);
      }
      const failExporterOptions = {
        projectId: NOEXIST_PROJECT_ID,
        logger: logger.logger('debug')
      };
      const failExporter = new StackdriverTraceExporter(failExporterOptions);
      const failTracer = new classes.Tracer();
      failTracer.start({samplingRate: 1});
      failTracer.registerEndSpanListener(failExporter);
      return failTracer.startRootSpan(
          {name: 'sdNoExportTestRootSpan'}, async (rootSpan) => {
            const span = failTracer.startChildSpan('sdNoExportTestChildSpan');
            span.end();
            rootSpan.end();

            return failExporter.publish([rootSpan]).then((result: string) => {
              assert.ok(result.indexOf('sendTrace error: ') >= 0);

              assert.strictEqual(
                  failExporter.failBuffer[0].traceId,
                  rootSpan.spanContext.traceId);
            });
          });
    });

    it('should export traces to stackdriver', () => {
      if (dryrun) {
        nocks.oauth2((body) => true);
        nocks.patchTraces(PROJECT_ID, null, null, false);
      }

      return tracer.startRootSpan(
          {name: 'sdExportTestRootSpan'}, async (rootSpan) => {
            const span = tracer.startChildSpan('sdExportTestChildSpan');
            span.end();
            rootSpan.end();

            return exporter.publish([rootSpan]).then((result: string) => {
              assert.ok(result.indexOf('sendTrace sucessfully') >= 0);
            });
          });
    });


    it('should fail exporting by network error', async () => {
      nock('https://cloudtrace.googleapis.com')
          .persist()
          .intercept(
              '/v1/projects/' + exporterOptions.projectId + '/traces', 'patch')
          .reply(443, 'Simulated Network Error');

      nocks.oauth2((body) => true);

      return tracer.startRootSpan(
          {name: 'sdErrorExportTestRootSpan'}, (rootSpan) => {
            const span = tracer.startChildSpan('sdErrorExportTestChildSpan');
            span.end();
            rootSpan.end();

            return exporter.publish([rootSpan]).then((result: string) => {
              assert.ok(result.indexOf('Simulated Network Error') >= 0);
            });
          });
    });
  });
});
