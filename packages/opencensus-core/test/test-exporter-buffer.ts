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

import * as assert from 'assert';
import * as mocha from 'mocha';

import * as logger from '../src/common/console-logger';
import {NoopExporter} from '../src/exporters/console-exporter';
import {ExporterBuffer} from '../src/exporters/exporter-buffer';
import {RootSpan} from '../src/trace/model/root-span';
import {Tracer} from '../src/trace/model/tracer';


const exporter = new NoopExporter();
const DEFAULT_BUFFER_SIZE = 3;
const DEFAULT_BUFFER_TIMEOUT = 2000;  // time in milliseconds
const tracer = new Tracer().start({});

const defaultBufferConfig = {
  bufferSize: DEFAULT_BUFFER_SIZE,
  bufferTimeout: DEFAULT_BUFFER_TIMEOUT,
  logger: logger.logger()
};


const createRootSpans = (num: number): RootSpan[] => {
  const rootSpans = [];
  for (let i = 0; i < num; i++) {
    const rootSpan = new RootSpan(tracer, {name: `rootSpan.${i}`});
    rootSpan.start();
    for (let j = 0; j < 10; j++) {
      rootSpan.startChildSpan(`childSpan.${i}.${j}`, 'client');
    }
    rootSpans.push(rootSpan);
  }
  return rootSpans;
};

describe('ExporterBuffer', () => {
  /**
   * Should create a Buffer with exporter, DEFAULT_BUFFER_SIZE and
   * DEFAULT_BUFFER_TIMEOUT
   */
  describe('new ExporterBuffer()', () => {
    it('should create a Buffer instance', () => {
      const buffer = new ExporterBuffer(exporter, defaultBufferConfig);
      assert.ok(buffer instanceof ExporterBuffer);
    });
  });

  /**
   * Should return the Buffer
   */
  describe('setBufferSize', () => {
    it('should set BufferSize', () => {
      const buffer = new ExporterBuffer(exporter, defaultBufferConfig);
      const newBufferSize = DEFAULT_BUFFER_SIZE + 10;
      const bufferResize = buffer.setBufferSize(newBufferSize);
      assert.ok(bufferResize instanceof ExporterBuffer);
      assert.strictEqual(bufferResize.getBufferSize(), newBufferSize);
    });
  });

  /**
   * Should add one item to the Buffer
   */
  describe('addToBuffer', () => {
    it('should add one item to the Buffer', () => {
      const buffer = new ExporterBuffer(exporter, defaultBufferConfig);
      buffer.addToBuffer(new RootSpan(tracer));
      assert.strictEqual(buffer.getQueue().length, 1);
    });
  });

  /**
   * Should force flush
   */
  describe('addToBuffer force flush ', () => {
    it('should force flush', () => {
      const buffer = new ExporterBuffer(exporter, defaultBufferConfig);
      const rootSpans = createRootSpans(DEFAULT_BUFFER_SIZE);
      for (const rootSpan of rootSpans) {
        buffer.addToBuffer(rootSpan);
      }
      assert.strictEqual(buffer.getQueue().length, buffer.getBufferSize());
      buffer.addToBuffer(new RootSpan(tracer));
      assert.strictEqual(buffer.getQueue().length, 0);
    });
  });

  /**
   * Should flush by timeout
   */
  describe('addToBuffer force flush by timeout ', () => {
    it('should flush by timeout', () => {
      const buffer = new ExporterBuffer(exporter, defaultBufferConfig);
      buffer.addToBuffer(new RootSpan(tracer));
      assert.strictEqual(buffer.getQueue().length, 1);
      setTimeout(() => {
        assert.strictEqual(buffer.getQueue().length, 0);
      }, DEFAULT_BUFFER_TIMEOUT + 100);
    });
  });
});