/**
 * Copyright 2018 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';
import * as mocha from 'mocha';

import {Buffer} from '../src/exporters/buffer';
import {ConsoleExporter, NoopExporter} from '../src/exporters/console-exporter';
import {RootSpan} from '../src/trace/model/root-span';
import {Tracer} from '../src/trace/model/tracer';

const tracer = new Tracer();
const DEFAULT_BUFFER_SIZE = 3;
const DEFAULT_BUFFER_TIMEOUT = 20000;  // time in milliseconds
const defaultBufferConfig = {
  bufferSize: DEFAULT_BUFFER_SIZE,
  bufferTimeout: DEFAULT_BUFFER_TIMEOUT
};

describe('NoopExporter', () => {
  /** Should do anything when calling onEndSpan() */
  describe('onEndSpan()', () => {
    it('should do anything', () => {
      const exporter = new NoopExporter();
      const rootSpan = new RootSpan(tracer);
      exporter.onEndSpan(rootSpan);
      assert.ok(true);
    });
  });

  /** Should do anything when calling publish() */
  describe('publish()', () => {
    it('should do anything', () => {
      const exporter = new NoopExporter();
      const rootSpan = new RootSpan(tracer);
      const queue: RootSpan[] = [];
      queue.push(rootSpan);

      exporter.publish(queue);
      assert.ok(true);
    });
  });
});

describe('ConsoleLogExporter', () => {
  /** Should end a span */
  describe('onEndSpan()', () => {
    it('should end a span', () => {
      const exporter = new ConsoleExporter(defaultBufferConfig);
      const rootSpan = new RootSpan(tracer);
      exporter.onEndSpan(rootSpan);
      assert.ok(true);
    });
  });

  /** Should publish the rootspan in queue */
  describe('publish()', () => {
    it('should publish the rootspans in queue', () => {
      const exporter = new ConsoleExporter(defaultBufferConfig);
      const rootSpan = new RootSpan(tracer);
      rootSpan.startSpan('name', 'type', rootSpan.traceId);
      const queue: RootSpan[] = [];
      queue.push(rootSpan);

      exporter.publish(queue);
      assert.ok(true);
    });
  });
});