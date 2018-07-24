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

import {RootSpan} from '../src/trace/model/root-span';
import {Span} from '../src/trace/model/span';
import {CoreTracer} from '../src/trace/model/tracer';
import * as types from '../src/trace/model/types';
import {Annotation, Attributes, Link, MessageEvent, TraceOptions} from '../src/trace/model/types';

const tracer = new CoreTracer();

describe('RootSpan', () => {
  /**
   * Should create a RootSpan instance
   */
  describe('new RootSpan()', () => {
    it('should create a RootSpan instance', () => {
      const root = new RootSpan(tracer);
      assert.ok(root instanceof RootSpan);
    });
  });

  /**
   * Should create a RootSpan instance with options
   */
  describe('new RootSpan() with options', () => {
    it('should create a RootSpan instance with options', () => {
      const trace = new RootSpan(tracer);
      const options = {name: 'test', spanContext: trace.spanContext} as
          TraceOptions;
      const root = new RootSpan(tracer, options);
      assert.ok(root instanceof RootSpan);
    });
  });

  /**
   * Should get span list from rootspan instance
   */
  describe('get spans()', () => {
    it('should get span list from rootspan instance', () => {
      const root = new RootSpan(tracer);
      // TODO: Suggetion: make sure that root.spans.length is 1,
      // and that it's the same as the earlier (shadowed) span object
      root.start();
      const span = root.startChildSpan('spanName', 'spanType');
      assert.strictEqual(root.spans.length, 1);
      assert.strictEqual(span, root.spans[0]);
      assert.strictEqual(root.parentSpanId, null);

      for (const span of root.spans) {
        assert.ok(span instanceof Span);
      }
    });
  });

  /**
   * Should get trace id from rootspan instance
   */
  describe('new traceId()', () => {
    it('should get trace id from rootspan instance', () => {
      const root = new RootSpan(tracer);
      assert.equal(root.traceId, root.spanContext.traceId);
    });
  });

  /**
   * Should create and start a RootSpan instance
   */
  describe('start()', () => {
    it('should start a RootSpan instance', () => {
      const root = new RootSpan(tracer);
      root.start();
      assert.ok(root.started);
    });
  });

  /**
   * Should create and start a new span instance
   */
  describe('startSpan()', () => {
    let root: types.RootSpan, span: types.Span;

    before(() => {
      root = new RootSpan(tracer);
      root.start();
      span = root.startChildSpan('spanName', 'spanType');
    });

    it('should create span instance', () => {
      assert.ok(span instanceof Span);
    });

    it('should start a span instance', () => {
      assert.ok(span.started);
    });
  });

  /**
   * Should not start a span from a not started rootspan
   */
  describe('startSpan() before start rootspan', () => {
    it('should not create span', () => {
      const root = new RootSpan(tracer);
      const span = root.startChildSpan('spanName', 'spanType');
      assert.strictEqual(span, null);
    });
  });

  /**
   * Should not create a span from a ended rootspan
   */
  describe('startSpan() after rootspan ended', () => {
    it('should not create span', () => {
      const root = new RootSpan(tracer);
      root.start();
      root.end();
      const span = root.startChildSpan('spanName', 'spanType');
      assert.strictEqual(span, null);
    });
  });

  /**
   * Should end a rootspan instance
   */
  describe('end()', () => {
    it('should end the rootspan instance', () => {
      const root = new RootSpan(tracer);
      root.start();
      root.end();
      assert.ok(root.ended);
    });
  });

  /**
   * Should not end a rootspan which was not started
   */
  describe('end() before start rootspan', () => {
    it('should not end rootspan', () => {
      const root = new RootSpan(tracer);
      root.end();
      assert.ok(!root.ended);
    });
  });

  /**
   * Should end all spans inside rootspan
   */
  describe('end() before end all spans', () => {
    it('should end all spans inside rootspan', () => {
      const root = new RootSpan(tracer);
      root.start();
      const span = root.startChildSpan('spanName', 'spanType');
      root.end();

      for (const span of root.spans) {
        assert.ok(span.ended);
      }
    });
  });


  /**
   * Should add an attrinbutes
   */
  describe('addAtribute()', () => {
    it('should add an attribute', () => {
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();

      ['String', 'Number', 'Boolean'].map(attType => {
        rootSpan.addAttribute('testKey' + attType, 'testValue' + attType);
        assert.equal(
            rootSpan.attributes['testKey' + attType], 'testValue' + attType);
      });
    });
  });

  /**
   * Should add an annotation
   */
  describe('addAnnotation()', () => {
    it('should add an annotation', () => {
      // tslint:disable:no-any
      function instanceOfAnnotation(object: any): object is Annotation {
        return 'description' in object && 'timestamp' in object &&
            'attributes' in object;
      }

      const rootSpan = new RootSpan(tracer);
      rootSpan.start();

      rootSpan.addAnnotation('description test', {} as Attributes, Date.now());

      assert.ok(rootSpan.annotations.length > 0);
      assert.ok(instanceOfAnnotation(rootSpan.annotations[0]));
    });
  });

  /**
   * Should add a Link.
   */
  describe('addLink()', () => {
    it('should add a Link', () => {
      // tslint:disable:no-any
      function instanceOfLink(object: any): object is Link {
        return 'traceId' in object && 'spanId' in object && 'type' in object;
      }

      const rootSpan = new RootSpan(tracer);
      rootSpan.start();

      const span = new Span(rootSpan);
      span.start();

      const LINK_TYPE = 'CHILD_LINKED_SPAN';
      rootSpan.addLink(rootSpan.traceId, span.id, LINK_TYPE);

      assert.ok(rootSpan.links.length > 0);
      assert.ok(instanceOfLink(rootSpan.links[0]));
    });
  });

  /**
   * Should add a Message Event.
   */
  describe('addMessageEvent()', () => {
    it('should add a Message Event', () => {
      // tslint:disable:no-any
      function instanceOfLink(object: any): object is Link {
        return 'type' in object && 'id' in object;
      }

      const rootSpan = new RootSpan(tracer);
      rootSpan.start();

      rootSpan.addMessageEvent('TYPE_UNSPECIFIED', 'message_event_test_id');

      assert.ok(rootSpan.messageEvents.length > 0);
      assert.ok(instanceOfLink(rootSpan.messageEvents[0]));
    });
  });
});
