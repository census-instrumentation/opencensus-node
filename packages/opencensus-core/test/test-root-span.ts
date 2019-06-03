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
import { NoRecordSpan } from '../src/trace/model/no-record/no-record-span';
import { RootSpan } from '../src/trace/model/root-span';
import { Span } from '../src/trace/model/span';
import { CoreTracer } from '../src/trace/model/tracer';
import * as types from '../src/trace/model/types';
import { Annotation, Link } from '../src/trace/model/types';

const tracer = new CoreTracer();

describe('RootSpan', () => {
  const name = 'MySpanName';
  const kind = types.SpanKind.SERVER;
  const traceId = 'd4cda95b652f4a1592b449d5929fda1b';
  const parentSpanId = '';

  /**
   * Should create a RootSpan instance
   */
  describe('new RootSpan()', () => {
    it('should create a RootSpan instance', () => {
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      assert.ok(root instanceof RootSpan);
    });
  });

  /**
   * Should get span list from rootspan instance
   */
  describe('get spans()', () => {
    it('should get span list from rootspan instance', () => {
      const root = new RootSpan(tracer, name, kind, traceId, '');
      root.start();
      const span = root.startChildSpan({
        name: 'spanName',
        kind: types.SpanKind.CLIENT,
      });

      assert.strictEqual(root.spans.length, 1);
      assert.strictEqual(span, root.spans[0]);
      assert.strictEqual(span.kind, types.SpanKind.CLIENT);
      assert.strictEqual(root.parentSpanId, parentSpanId);

      for (const span of root.spans) {
        assert.ok(span instanceof Span);
      }
    });
  });

  describe('get numberOfChildren()', () => {
    it('should get numberOfChildren from rootspan instance', () => {
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      root.start();
      assert.strictEqual(root.numberOfChildren, 0);
      root.startChildSpan({
        name: 'spanName',
        kind: types.SpanKind.UNSPECIFIED,
      });
      assert.strictEqual(root.numberOfChildren, 1);

      for (let i = 0; i < 10; i++) {
        root.startChildSpan({
          name: 'spanName' + i,
          kind: types.SpanKind.UNSPECIFIED,
        });
      }
      assert.strictEqual(root.numberOfChildren, 11);
    });
  });

  describe('nested spans', () => {
    it('should get nested spans from rootspan instance', () => {
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      root.start();
      assert.strictEqual(root.numberOfChildren, 0);
      const child1 = root.startChildSpan({
        name: 'child1',
        kind: types.SpanKind.UNSPECIFIED,
      });
      assert.strictEqual(root.numberOfChildren, 1);
      assert.strictEqual(child1.numberOfChildren, 0);
      const child2 = root.startChildSpan({
        name: 'child2',
        kind: types.SpanKind.UNSPECIFIED,
      });
      assert.strictEqual(root.numberOfChildren, 2);
      const grandchild1 = child1.startChildSpan({
        name: 'grandchild1',
        kind: types.SpanKind.UNSPECIFIED,
      });
      assert.strictEqual(root.numberOfChildren, 2);
      assert.strictEqual(child1.numberOfChildren, 1);
      assert.strictEqual(child2.numberOfChildren, 0);
      assert.strictEqual(grandchild1.numberOfChildren, 0);

      assert.strictEqual(root.spans.length, 2);
      assert.strictEqual(child1, root.spans[0]);
      assert.strictEqual(child2, root.spans[1]);
      assert.strictEqual(grandchild1.parentSpanId, child1.id);

      assert.strictEqual(child1.spans.length, 1);
      assert.strictEqual(grandchild1, child1.spans[0]);

      assert.strictEqual(child2.spans.length, 0);
      assert.strictEqual(grandchild1.spans.length, 0);

      assert.strictEqual(root.allDescendants().length, 3);
    });
  });

  /**
   * Should get trace id from rootspan instance
   */
  describe('new traceId()', () => {
    it('should get trace id from rootspan instance', () => {
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      root.start();
      assert.strictEqual(root.traceId, root.spanContext.traceId);

      const child = root.startChildSpan({
        name: 'child',
        kind: types.SpanKind.UNSPECIFIED,
      });
      assert.strictEqual(root.traceId, child.traceId);
    });
  });

  /**
   * Should create and start a RootSpan instance
   */
  describe('start()', () => {
    it('should start a RootSpan instance', () => {
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      root.start();
      assert.ok(root.started);
    });
  });

  /**
   * Should create and start a new span instance
   */
  describe('startSpan()', () => {
    let root: RootSpan, span: types.Span;

    before(() => {
      root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      root.start();
      span = root.startChildSpan({
        name: 'spanName',
        kind: types.SpanKind.UNSPECIFIED,
      });
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
    it('should create NoRecordSpan', () => {
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      const span = root.startChildSpan({
        name: 'spanName',
        kind: types.SpanKind.UNSPECIFIED,
      });
      assert.ok(span instanceof NoRecordSpan);
    });
  });

  /**
   * Should not create a span from a ended rootspan
   */
  describe('startSpan() after rootspan ended', () => {
    it('should create NoRecordSpan', () => {
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      root.start();
      root.end();
      const span = root.startChildSpan({
        name: 'spanName',
        kind: types.SpanKind.UNSPECIFIED,
      });
      assert.ok(span instanceof NoRecordSpan);
    });
  });

  /**
   * Should end a rootspan instance
   */
  describe('end()', () => {
    it('should end the rootspan instance', () => {
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
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
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      root.end();
      assert.ok(!root.ended);
    });
  });

  /**
   * Should end all spans inside rootspan
   */
  describe('end() before end all spans', () => {
    it('should end all spans inside rootspan', () => {
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      root.start();
      const child = root.startChildSpan({
        name: 'child',
        kind: types.SpanKind.UNSPECIFIED,
      });
      child.startChildSpan({
        name: 'grandchild',
        kind: types.SpanKind.UNSPECIFIED,
      });
      root.end();

      for (const span of root.allDescendants()) {
        assert.ok(span.ended);
      }
    });
  });

  /**
   * Should add an attrinbutes
   */
  describe('addAtribute()', () => {
    it('should add an attribute', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      ['String', 'Number', 'Boolean'].map(attType => {
        rootSpan.addAttribute('testKey' + attType, 'testValue' + attType);
        assert.strictEqual(
          rootSpan.attributes['testKey' + attType],
          'testValue' + attType
        );
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
        return (
          'description' in object &&
          'timestamp' in object &&
          'attributes' in object
        );
      }

      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      rootSpan.addAnnotation('description test', {}, Date.now());

      assert.ok(rootSpan.annotations.length > 0);
      assert.ok(instanceOfAnnotation(rootSpan.annotations[0]));
    });

    it('should add an annotation without attributes and timestamp', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      rootSpan.addAnnotation('description test');

      assert.ok(rootSpan.annotations.length > 0);
      assert.strictEqual(rootSpan.droppedAnnotationsCount, 0);
      assert.strictEqual(
        rootSpan.annotations[0].description,
        'description test'
      );
      assert.deepStrictEqual(rootSpan.annotations[0].attributes, {});
      assert.ok(rootSpan.annotations[0].timestamp > 0);
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

      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      const span = new Span(tracer, rootSpan);
      span.start();

      rootSpan.addLink(
        rootSpan.traceId,
        span.id,
        types.LinkType.CHILD_LINKED_SPAN
      );

      assert.ok(rootSpan.links.length > 0);
      assert.strictEqual(rootSpan.droppedLinksCount, 0);
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

      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();
      rootSpan.addMessageEvent(types.MessageEventType.UNSPECIFIED, 1);

      assert.ok(rootSpan.messageEvents.length > 0);
      assert.strictEqual(rootSpan.droppedMessageEventsCount, 0);
      assert.ok(instanceOfLink(rootSpan.messageEvents[0]));
    });
  });

  describe('get traceState()', () => {
    it('should handle optional / undefined traceState', () => {
      const root = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      assert.ok(root instanceof RootSpan);
      assert.strictEqual(root.traceState, undefined);
    });

    it('should create a RootSpan instance with traceState', () => {
      const root = new RootSpan(
        tracer,
        name,
        kind,
        traceId,
        parentSpanId,
        'traceState'
      );
      assert.ok(root instanceof RootSpan);
      assert.strictEqual(root.traceState, 'traceState');
    });
  });
});
