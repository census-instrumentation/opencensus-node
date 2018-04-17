/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {Buffer} from '../src/exporters/buffer';
import {NoopExporter} from '../src/exporters/consolelog-exporter';
import {RootSpanImpl} from '../src/trace/model/rootspan';
import {TracerImpl} from '../src/trace/model/tracer';

const exporter = new NoopExporter();
const DEFAULT_BUFFER_SIZE = 3;
const DEFAULT_BUFFER_TIMEOUT = 20000;  // time in milliseconds
const tracer = new TracerImpl();


describe('Buffer', () => {
  /**
   * Should create a Buffer with exporter, DEFAULT_BUFFER_SIZE and
   * DEFAULT_BUFFER_TIMEOUT
   */
  describe('new Buffer()', () => {
    it('should create a Buffer instance', () => {
      const buffer =
          new Buffer(exporter, DEFAULT_BUFFER_SIZE, DEFAULT_BUFFER_TIMEOUT);
      assert.ok(buffer instanceof Buffer);
    });
  });

  /**
   * Should return the Buffer
   */
  describe('setBufferSize', () => {
    it('should return the Buffer instance', () => {
      const buffer = new Buffer(exporter);
      const bufferResize = buffer.setBufferSize(DEFAULT_BUFFER_SIZE);
      assert.ok(bufferResize instanceof Buffer);
    });
  });

  /**
   * Should return the Buffer with rootspan
   */
  describe('addToBuffer', () => {
    it('should return the Buffer instance', () => {
      const buffer = new Buffer(exporter);
      const rootSpan = new RootSpanImpl(tracer);
      const bufferAdd = buffer.addToBuffer(rootSpan);
      assert.ok(bufferAdd instanceof Buffer);
    });
  });

  /**
   * Should return the Buffer without rootspan
   */
  describe('addToBuffer force flush ', () => {
    it('should return the Buffer instance', () => {
      const buffer = new Buffer(exporter);
      const bufferResize = buffer.setBufferSize(0);
      const rootSpan = new RootSpanImpl(tracer);
      const bufferAdd = bufferResize.addToBuffer(rootSpan);
      assert.ok(bufferAdd instanceof Buffer);
    });
  });

  /**
   * Should return the Buffer without rootspan
   */
  describe('addToBuffer force flush by timeout ', () => {
    it('should return the Buffer instance', () => {
      const buffer = new Buffer(exporter, DEFAULT_BUFFER_SIZE, 0);
      const rootSpan = new RootSpanImpl(tracer);
      let bufferAdd = buffer.addToBuffer(rootSpan);
      bufferAdd = buffer.addToBuffer(rootSpan);
      assert.ok(bufferAdd instanceof Buffer);
    });
  });
});