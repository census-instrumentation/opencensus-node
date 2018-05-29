/**
 * Copyright 2018, OpenCensus Authors
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

import {ConsoleExporter, NoopExporter} from '../src/exporters/console-exporter';
import {ExporterBuffer} from '../src/exporters/exporter-buffer';
import {RootSpan} from '../src/trace/model/root-span';
import {Tracer} from '../src/trace/model/tracer';

const tracer = new Tracer().start({});
const DEFAULT_BUFFER_SIZE = 3;
const DEFAULT_BUFFER_TIMEOUT = 20000;  // time in milliseconds
const defaultBufferConfig = {
  bufferSize: DEFAULT_BUFFER_SIZE,
  bufferTimeout: DEFAULT_BUFFER_TIMEOUT
};

const createRootSpans = (): RootSpan[] => {
  const rootSpans = [];
  for (let i = 0; i < DEFAULT_BUFFER_SIZE + 1; i++) {
    const rootSpan = new RootSpan(tracer, {name: `rootSpan.${i}`});
    rootSpan.start();
    for (let j = 0; j < 10; j++) {
      rootSpan.startChildSpan(`childSpan.${i}.${j}`, 'client');
    }
    rootSpans.push(rootSpan);
  }
  return rootSpans;
};


describe('NoopExporter', () => {
  /** Should do nothing when calling onEndSpan() */
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
      tracer.registerSpanEventListener(exporter);
      // const rootSpan = new RootSpan(tracer);
      const rootSpans = createRootSpans();
      for (const rootSpan of rootSpans) {
        rootSpan.end();
      }
      assert.ok(true);
    });
  });

  /** Should publish the rootspan in queue */
  describe('publish()', () => {
    it('should publish the rootspans in queue', () => {
      const exporter = new ConsoleExporter(defaultBufferConfig);
      const rootSpan = new RootSpan(tracer);
      rootSpan.startChildSpan('name', 'type', rootSpan.traceId);
      const queue: RootSpan[] = [];
      queue.push(rootSpan);

      exporter.publish(queue);
      assert.ok(true);
    });
  });
});