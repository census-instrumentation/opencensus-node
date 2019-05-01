/**
 * Copyright 2018 OpenCensus Authors.
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

import {CoreTracerCls, Span, SpanKind, TracerConfig} from '@opencensus/core';
import * as assert from 'assert';
import * as nock from 'nock';
import {InstanaTraceExporter} from '../src/instana';

/** Default config for traces tests */
const defaultConfig: TracerConfig = {
  samplingRate: 1
};

/** Run a nock server to replace the Instana agent */
const runNockServer = () => {
  nock('http://127.0.0.1:42699')
      .persist()
      .post('/com.instana.plugin.generic.trace')
      .reply(200);
};

/** Checking if tests will use a real network, otherwise run a nock server */
before(() => {
  runNockServer();
});

describe('Instana Exporter', function() {
  /** Desabling the timeout for tests */
  this.timeout(0);

  describe('publish()', () => {
    it('should send traces to Instana agent', async () => {
      const exporter = new InstanaTraceExporter();
      const tracer = new CoreTracerCls();
      tracer.start(defaultConfig);

      return tracer
          .startRootSpan(
              {name: 'root-test'},
              async (rootSpan: Span) => {
                const span = rootSpan.startChildSpan(
                    {name: 'spanTest', kind: SpanKind.CLIENT});
                span.end();
                rootSpan.end();
                return exporter.publish([rootSpan, rootSpan]);
              })
          .then(error => assert.ifError(error));
    });
  });
});
