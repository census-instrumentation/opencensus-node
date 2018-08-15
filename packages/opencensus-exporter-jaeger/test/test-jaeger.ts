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

import {CoreTracer, RootSpan, TracerConfig} from '@opencensus/core';
import {logger, Logger} from '@opencensus/core';
import * as assert from 'assert';
import * as fs from 'fs';
import * as mocha from 'mocha';
import * as nock from 'nock';
import * as shimmer from 'shimmer';

import {JaegerTraceExporter, JaegerTraceExporterOptions} from '../src/';
import {spanToThrift, ThriftUtils, UDPSender} from '../src/jaeger-driver';

const DEFAULT_BUFFER_TIMEOUT = 10;  // time in milliseconds

import {ThriftProcess} from '../src/jaeger-driver';
import {SenderCallback} from '../src/jaeger-driver';


/**
 * Controls if the tests will use a real network or not
 * true to use a real zipkin service
 * false to use a nock server
 */
const OPENCENSUS_NETWORK_TESTS =
    ['true', 'TRUE', '1'].indexOf(process.env.OPENCENSUS_NETWORK_TESTS) > -1;


describe('Jaeger Exporter', () => {
  const testLogger = logger.logger('debug');
  const dryrun = !OPENCENSUS_NETWORK_TESTS;
  let exporterOptions: JaegerTraceExporterOptions;
  let exporter: JaegerTraceExporter;
  let tracer: CoreTracer;


  before(() => {
    testLogger.debug('dryrun=%s', dryrun);
    exporterOptions = {
      serviceName: 'opencensus-exporter-jaeger',
      host: 'localhost',
      port: 6832,
      tags: [{key: 'opencensus-exporter-jeager', value: '0.0.1'}],
      bufferTimeout: DEFAULT_BUFFER_TIMEOUT,
      logger: testLogger,
      maxPacketSize: 1000
    } as JaegerTraceExporterOptions;
  });

  beforeEach(() => {
    exporter = new JaegerTraceExporter(exporterOptions);
    if (dryrun) {
      mockUDPSender(exporter);
    }
    tracer = new CoreTracer();
    tracer.start({samplingRate: 1});
    tracer.registerSpanEventListener(exporter);
  });

  afterEach(() => {
    exporter.close();
  });

  describe('exporter configuration', () => {
    it('should contain process information', () => {
      const process: ThriftProcess = exporter.sender._process;

      // Service name
      assert.strictEqual(process.serviceName, 'opencensus-exporter-jaeger');

      // Tags. Validate that both the user-given and default tags are present.
      let testVersionSeen = false;
      let testExporterVersionSeen = false;
      let testHostnameSeen = false;
      let testProcessIpSeen = false;
      process.tags.forEach((tag) => {
        if (tag.key === 'opencensus-exporter-jeager' &&
            tag.vType === 'STRING' && tag.vStr === '0.0.1') {
          testVersionSeen = true;
          return;
        }
        if (tag.key ===
            JaegerTraceExporter.JAEGER_OPENCENSUS_EXPORTER_VERSION_TAG_KEY) {
          testExporterVersionSeen = true;
          return;
        }
        if (tag.key === JaegerTraceExporter.TRACER_HOSTNAME_TAG_KEY) {
          testHostnameSeen = true;
          return;
        }
        if (tag.key === JaegerTraceExporter.PROCESS_IP) {
          testProcessIpSeen = true;
          return;
        }
      });
      assert.ok(
          testVersionSeen && testExporterVersionSeen && testHostnameSeen &&
          testProcessIpSeen);
    });
  });

  /* Should export spans to Jeager */
  describe('test spans are valid', () => {
    it('should encode as thrift', () => {
      return tracer.startRootSpan({name: 'root-s01'}, (rootSpan) => {
        const span = tracer.startChildSpan('child-s01');
        span.addAttribute('testBool', true);
        span.addAttribute('testString', 'here');
        span.addAttribute('testNum', 3.142);
        span.addAnnotation('something happened', {
          'error': true,
        });
        span.end();
        rootSpan.end();
        const thriftSpan = spanToThrift(span);
        const result = ThriftUtils._thrift.Span.rw.toBuffer(thriftSpan);
        assert.strictEqual(result.err, null);

        assert.strictEqual(thriftSpan.tags.length, 3);
        let testBoolSeen = false;
        let testStringSeen = false;
        let testNumSeen = false;
        thriftSpan.tags.forEach((tag) => {
          if (tag.key === 'testBool' && tag.vType === 'BOOL' &&
              tag.vBool === true) {
            testBoolSeen = true;
            return;
          }
          if (tag.key === 'testString' && tag.vType === 'STRING' &&
              tag.vStr === 'here') {
            testStringSeen = true;
            return;
          }
          if (tag.key === 'testNum' && tag.vType === 'DOUBLE' &&
              tag.vDouble === 3.142) {
            testNumSeen = true;
            return;
          }
        });

        assert.ok(testBoolSeen && testStringSeen && testNumSeen);

        assert.strictEqual(thriftSpan.logs.length, 1);
        thriftSpan.logs.forEach((log) => {
          let descriptionSeen = false;
          let errorSeen = false;
          log.fields.forEach((field) => {
            if (field.key === 'description' && field.vType === 'STRING' &&
                field.vStr === 'something happened') {
              descriptionSeen = true;
              return;
            }
            if (field.key === 'error' && field.vType === 'BOOL' &&
                field.vBool === true) {
              errorSeen = true;
              return;
            }
            assert.ok(descriptionSeen && errorSeen);
          });
        });
      });
    });
  });

  /* Should export spans to Jeager */
  describe('publish()', () => {
    it('should export spans to Jeager', () => {
      return tracer.startRootSpan({name: 'root-s01'}, (rootSpan) => {
        const span = tracer.startChildSpan('child-s01');
        span.end();
        rootSpan.end();

        return exporter.publish([rootSpan]).then((result) => {
          assert.strictEqual(result, 2);
        });
      });
    });
  });


  describe('addToBuffer force flush by timeout ', () => {
    it('should flush by timeout', (done) => {
      assert.strictEqual(exporter.queue.length, 0);
      tracer.startRootSpan({name: 'root-s02'}, (rootSpan) => {
        const span = tracer.startChildSpan('child-s02');
        span.end();
        rootSpan.end();

        assert.strictEqual(exporter.successCount, 0);
        setTimeout(() => {
          assert.strictEqual(exporter.successCount, 2);
          done();
        }, DEFAULT_BUFFER_TIMEOUT * 2 + 100);
      });
    });
  });
});


function mockUDPSender(exporter: JaegerTraceExporter) {
  // Get the process of the current sender and pass to the mock sender. The
  // process is constructed and attached to the sender at exporter construction
  // time at initialization time, so there is no way to intercept the process.
  const process: ThriftProcess = exporter.sender._process;

  exporter.sender = new MockedUDPSender();
  exporter.sender.setProcess(process);
}


class MockedUDPSender extends UDPSender {
  // tslint:disable-next-line:no-any
  queue: any = [];

  // Holds the initialized process information. Name matches the associated
  // UDPSender property.
  _process: ThriftProcess;

  setProcess(process: ThriftProcess): void {
    this._process = process;
  }

  // tslint:disable-next-line:no-any
  append(span: any, callback?: SenderCallback): void {
    this.queue.push(span);
    if (callback) {
      callback(0);
    }
  }

  flush(callback?: SenderCallback): void {
    if (callback) {
      callback(this.queue.length);
      this.queue = [];
    }
  }

  close(): void {}
}
