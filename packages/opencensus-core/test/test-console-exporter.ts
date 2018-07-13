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
import {CoreTracer} from '../src/trace/model/tracer';

const tracer = new CoreTracer().start({samplingRate: 1.0});
const defaultBufferConfig = {
  bufferSize: 1,
  bufferTimeout: 20000  // time in milliseconds
};

describe('NoopExporter', () => {
  /** Should do nothing when calling onEndSpan() */
  describe('onEndSpan()', () => {
    it('should do nothing', () => {
      const exporter = new NoopExporter();
      const rootSpan = new RootSpan(tracer);
      exporter.onEndSpan(rootSpan);
      assert.ok(true);
    });
  });

  /** Should do anything when calling publish() */
  describe('publish()', () => {
    it('should do nothing', () => {
      const exporter = new NoopExporter();
      const rootSpan = new RootSpan(tracer);
      const queue: RootSpan[] = [rootSpan];

      return exporter.publish(queue);
    });
  });
});

describe('ConsoleLogExporter', () => {
  /** Should end a span */
  describe('onEndSpan()', () => {
    it('should end a span', () => {
      const intercept = require('intercept-stdout');
      let capturedText = '';
      const unhookIntercept = intercept((txt: string) => {
        capturedText += txt;
      });

      const exporter = new ConsoleExporter(defaultBufferConfig);

      const rootSpan1 = new RootSpan(tracer);
      exporter.onEndSpan(rootSpan1);
      assert.strictEqual(capturedText, '');

      const rootSpan2 = new RootSpan(tracer);
      exporter.onEndSpan(rootSpan2);
      [rootSpan1, rootSpan2].map(rootSpan => {
        assert.ok(capturedText.indexOf(rootSpan.traceId) >= 0);
        assert.ok(capturedText.indexOf(rootSpan.id) >= 0);
        assert.ok(capturedText.indexOf(rootSpan.name) >= 0);
      });
    });
  });

  /** Should publish the rootspan in queue */
  describe('publish()', () => {
    it('should publish the rootspans in queue', () => {
      const intercept = require('intercept-stdout');
      let capturedText = '';
      const unhookIntercept = intercept((txt: string) => {
        capturedText += txt;
      });

      const exporter = new ConsoleExporter(defaultBufferConfig);
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();
      rootSpan.startChildSpan('name', 'type', rootSpan.traceId);
      const queue: RootSpan[] = [rootSpan];

      return exporter.publish(queue).then(() => {
        assert.ok(capturedText.indexOf(rootSpan.traceId) >= 0);
        assert.ok(capturedText.indexOf(rootSpan.id) >= 0);
        assert.ok(capturedText.indexOf(rootSpan.name) >= 0);
        assert.ok(capturedText.indexOf(rootSpan.spans[0].name) >= 0);
        assert.ok(capturedText.indexOf(rootSpan.spans[0].id) >= 0);
      });
    });
  });
});