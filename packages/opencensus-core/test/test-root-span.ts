/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {RootSpanImpl} from '../src/trace/model/rootspan';
import {SpanImpl} from '../src/trace/model/span';
import {TracerImpl} from '../src/trace/model/tracer';
import {Annotation, Attributes, Link, MessageEvent, RootSpan, Span, TraceOptions, Tracer} from '../src/trace/model/types';

const tracer = new TracerImpl();

describe('RootSpan', () => {
  /**
   * Should create a RootSpan instance
   */
  describe('new RootSpan()', () => {
    it('should create a RootSpan instance', () => {
      const root = new RootSpanImpl(tracer);
      assert.ok(root instanceof RootSpanImpl);
    });
  });

  /**
   * Should create a RootSpan instance with options
   */
  describe('new RootSpan() with options', () => {
    it('should create a RootSpan instance with options', () => {
      const trace = new RootSpanImpl(tracer);
      const options = {name: 'test', traceContext: trace.traceContext} as
          TraceOptions;
      const root = new RootSpanImpl(tracer, options);
      assert.ok(root instanceof RootSpanImpl);
    });
  });

  /**
   * Should get span list from rootspan instance
   */
  describe('get spans()', () => {
    it('should get span list from rootspan instance', () => {
      const root = new RootSpanImpl(tracer);
      root.start();
      const span = root.startSpan('spanName', 'spanType');

      for (const span of root.spans) {
        assert.ok(span instanceof SpanImpl);
      }
    });
  });

  /**
   * Should get trace id from rootspan instance
   */
  describe('new traceId()', () => {
    it('should get trace id from rootspan instance', () => {
      const root = new RootSpanImpl(tracer);
      assert.equal(root.traceId, root.traceContext.traceId);
    });
  });

  /**
   * Should create and start a RootSpan instance
   */
  describe('start()', () => {
    it('should start a RootSpan instance', () => {
      const root = new RootSpanImpl(tracer);
      root.start();
      assert.ok(root.started);
    });
  });

  /**
   * Should create and start a new span instance
   */
  describe('startSpan()', () => {
    let root, span;

    before(() => {
      root = new RootSpanImpl(tracer);
      root.start();
      span = root.startSpan('spanName', 'spanType');
    });

    it('should create span instance', () => {
      assert.ok(span instanceof SpanImpl);
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
      const root = new RootSpanImpl(tracer);
      const span = root.startSpan('spanName', 'spanType');
      assert.ok(span == null);
    });
  });

  /**
   * Should not create a span from a ended rootspan
   */
  describe('startSpan() after rootspan ended', () => {
    it('should not create span', () => {
      const root = new RootSpanImpl(tracer);
      root.start();
      root.end();
      const span = root.startSpan('spanName', 'spanType');
      assert.ok(span == null);
    });
  });

  /**
   * Should end a rootspan instance
   */
  describe('end()', () => {
    it('should end the rootspan instance', () => {
      const root = new RootSpanImpl(tracer);
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
      const root = new RootSpanImpl(tracer);
      root.end();
      assert.ok(!root.ended);
    });
  });

  /**
   * Should end all spans inside rootspan
   */
  describe('end() before end all spans', () => {
    it('should end all spans inside rootspan', () => {
      const root = new RootSpanImpl(tracer);
      root.start();
      const span = root.startSpan('spanName', 'spanType');
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
      const rootSpan = new RootSpanImpl(tracer);
      rootSpan.start();

      ['String', 'Number', 'Boolean'].map(attType => {
        rootSpan.addAtribute('testKey' + attType, 'testValue' + attType);
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

      const rootSpan = new RootSpanImpl(tracer);
      rootSpan.start();

      rootSpan.addAnnotation('description test', Date.now(), {} as Attributes);

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

      const rootSpan = new RootSpanImpl(tracer);
      rootSpan.start();

      const span = new SpanImpl(rootSpan);
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

      const rootSpan = new RootSpanImpl(tracer);
      rootSpan.start();

      rootSpan.addMessageEvent('TYPE_UNSPECIFIED', 'message_event_test_id');

      assert.ok(rootSpan.messageEvents.length > 0);
      assert.ok(instanceOfLink(rootSpan.messageEvents[0]));
    });
  });
});
