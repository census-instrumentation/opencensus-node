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
import { RootSpan } from '../src/trace/model/root-span';
import { Span } from '../src/trace/model/span';
import { CoreTracer } from '../src/trace/model/tracer';
import * as types from '../src/trace/model/types';
import { Annotation, Link } from '../src/trace/model/types';

// TODO: we should evaluate a way to merge similar test cases between span and
// rootspan

const tracer = new CoreTracer();
tracer.activeTraceParams = {
  numberOfAttributesPerSpan: 32,
  numberOfLinksPerSpan: 32,
  numberOfAnnontationEventsPerSpan: 32,
  numberOfMessageEventsPerSpan: 32,
};

describe('Span', () => {
  const name = 'MySpanName';
  const kind = types.SpanKind.SERVER;
  const traceId = 'd4cda95b652f4a1592b449d5929fda1b';
  const parentSpanId = '';

  /**
   * Should create a span
   */
  describe('new Span()', () => {
    it('should create a Span instance', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      const span = new Span(tracer, rootSpan);
      assert.ok(span instanceof Span);
    });

    it('should use relative clock for child spans', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();
      const span = new Span(tracer, rootSpan);
      span.start();
      assert.ok(rootSpan.startTime.getTime() <= span.startTime.getTime());
    });
  });

  /**
   * Should return the Trace ID
   */
  describe('get traceId()', () => {
    it('should return the trace id', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();
      const span = new Span(tracer, rootSpan);
      assert.strictEqual(span.traceId, rootSpan.traceId);
    });
  });

  /**
   * Should the span context of span
   */
  describe('get spanContext', () => {
    it('should the span context of span', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      const span = new Span(tracer, rootSpan);
      const context = span.spanContext;

      assert.strictEqual(context.traceId, rootSpan.traceId);
      assert.strictEqual(context.spanId, span.id);
      assert.strictEqual(context.options, 1);
    });
  });

  /**
   * startTime, endTime and durantion proprieties called before start() - no
   * clock instance created
   */
  describe('get time properties before start()', () => {
    let span: types.Span;
    before(() => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();
      span = new Span(tracer, rootSpan);
    });
    it('should get startTime()', () => {
      assert.ok(span.startTime);
    });
    it('should get endTime()', () => {
      assert.ok(span.endTime);
    });
    it('should get duration() return 0', () => {
      assert.strictEqual(span.duration, 0);
    });
  });

  /**
   * Should start a span instance
   */
  describe('start()', () => {
    it('should start a span instance', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      const span = new Span(tracer, rootSpan);
      span.start();

      assert.ok(span.started);
    });

    it('should start a RootSpan and set CurrentRootSpan when parentSpanId is empty', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, '');
      rootSpan.start();
      assert.strictEqual(tracer.currentRootSpan, rootSpan);

      const span = new Span(tracer, rootSpan);
      span.start();
      assert.strictEqual(tracer.currentRootSpan, rootSpan);

      assert.ok(span.started);
    });

    it('should start a RootSpan and set CurrentRootSpan when parentSpanId is not empty', () => {
      const rootSpan = new RootSpan(
        tracer,
        name,
        kind,
        traceId,
        'd5955a12632d46a1'
      );
      rootSpan.start();
      assert.strictEqual(tracer.currentRootSpan, rootSpan);

      const span = new Span(tracer, rootSpan);
      span.start();
      assert.strictEqual(tracer.currentRootSpan, rootSpan);

      assert.ok(span.started);
    });
  });

  /**
   * Should not change the initial startTime
   */
  describe('start() an already started span', () => {
    it('should not change the initial startTime', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();
      const span = new Span(tracer, rootSpan);
      span.start();
      const initialStartTime = span.startTime;
      span.start();

      assert.strictEqual(span.startTime, initialStartTime);
    });
  });

  /**
   * Should end a span instance
   */
  describe('end()', () => {
    it('should end a span instance', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      const span = new Span(tracer, rootSpan);
      span.start();
      span.end();

      assert.ok(span.ended);
    });
  });

  /**
   * Should not end a span instance
   */
  describe('end() before start()', () => {
    it('should not end a span instance', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      const span = new Span(tracer, rootSpan);
      span.end();

      assert.ok(!span.ended);
    });
  });

  /**
   * Should not change the endTime
   */
  describe('end() an already ended span', () => {
    it('should not change the endTime', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();
      const span = new Span(tracer, rootSpan);
      span.start();
      span.end();
      const initialEndTime = span.endTime;
      span.end();

      assert.strictEqual(span.endTime!.getTime(), initialEndTime!.getTime());
    });
  });

  /**
   * Should add an attrinbutes
   */
  describe('addAtribute()', () => {
    it('should add an attribute', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      const span = new Span(tracer, rootSpan);
      span.start();

      ['String', 'Number', 'Boolean'].map(attType => {
        span.addAttribute('testKey' + attType, 'testValue' + attType);
        assert.strictEqual(
          span.attributes['testKey' + attType],
          'testValue' + attType
        );
      });
      span.addAttribute('object', { foo: 'bar' });
      assert.strictEqual(span.attributes['object'], '{"foo":"bar"}');
      span.addAttribute('array', [1, 2, 3]);
      assert.strictEqual(span.attributes['array'], '[1,2,3]');
    });

    it('should drop extra attributes', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      const span = new Span(tracer, rootSpan);
      span.start();
      for (let i = 0; i < 40; i++) {
        span.addAttribute('attr' + i, 100);
      }

      assert.strictEqual(Object.keys(span.attributes).length, 32);
      assert.strictEqual(span.droppedAttributesCount, 8);
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

      const span = new Span(tracer, rootSpan);
      span.start();

      span.addAnnotation('description test', {}, Date.now());

      assert.ok(span.annotations.length > 0);
      assert.strictEqual(span.droppedAnnotationsCount, 0);
      assert.ok(instanceOfAnnotation(span.annotations[0]));
    });

    it('should drop extra annotations', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      const span = new Span(tracer, rootSpan);
      span.start();
      for (let i = 0; i < 40; i++) {
        span.addAnnotation('description test', {}, Date.now());
      }

      assert.strictEqual(span.annotations.length, 32);
      assert.strictEqual(span.droppedAnnotationsCount, 8);
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

      span.addLink(
        span.traceId,
        rootSpan.id,
        types.LinkType.PARENT_LINKED_SPAN
      );

      assert.ok(span.links.length > 0);
      assert.strictEqual(span.droppedLinksCount, 0);
      assert.ok(instanceOfLink(span.links[0]));
    });

    it('should drop extra links', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();
      const span = new Span(tracer, rootSpan);
      span.start();

      for (let i = 0; i < 35; i++) {
        span.addLink(
          span.traceId,
          rootSpan.id,
          types.LinkType.PARENT_LINKED_SPAN
        );
      }

      assert.strictEqual(span.links.length, 32);
      assert.strictEqual(span.droppedLinksCount, 3);
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

      const span = new Span(tracer, rootSpan);
      span.start();

      span.addMessageEvent(
        types.MessageEventType.UNSPECIFIED,
        /* id */ 1,
        /* timestamp */ 1550000000000,
        /* uncompressedSize */ 55,
        /** compressedSize */ 40
      );

      assert.ok(span.messageEvents.length > 0);
      assert.deepStrictEqual(span.messageEvents, [
        {
          type: types.MessageEventType.UNSPECIFIED,
          id: 1,
          timestamp: 1550000000000,
          uncompressedSize: 55,
          compressedSize: 40,
        },
      ]);
      assert.strictEqual(span.droppedMessageEventsCount, 0);
      assert.ok(instanceOfLink(span.messageEvents[0]));
    });

    it('should drop extra  Message Event', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      const span = new Span(tracer, rootSpan);
      span.start();
      for (let i = 0; i < 35; i++) {
        span.addMessageEvent(types.MessageEventType.UNSPECIFIED, 1);
      }

      assert.strictEqual(span.messageEvents.length, 32);
      assert.strictEqual(span.droppedMessageEventsCount, 3);
    });
  });

  describe('setStatus()', () => {
    it('should return default status', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();

      const span = new Span(tracer, rootSpan);
      span.start();

      assert.strictEqual(rootSpan.status.code, 0);
      assert.strictEqual(rootSpan.status.message, undefined);
      assert.strictEqual(span.status.code, 0);
      assert.strictEqual(span.status.message, undefined);
    });

    it('should set an error status', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();
      const span = new Span(tracer, rootSpan);
      span.start();
      span.setStatus(types.CanonicalCode.PERMISSION_DENIED, 'This is an error');

      assert.strictEqual(rootSpan.status.code, 0);
      assert.strictEqual(rootSpan.status.message, undefined);
      assert.strictEqual(span.status.code, 7);
      assert.strictEqual(span.status.message, 'This is an error');
    });
  });

  describe('get traceState()', () => {
    it('should return the traceState', () => {
      const rootSpan = new RootSpan(
        tracer,
        name,
        kind,
        traceId,
        parentSpanId,
        'traceState'
      );
      rootSpan.start();
      assert.strictEqual(rootSpan.traceState, 'traceState');

      const span = new Span(tracer, rootSpan);
      assert.strictEqual(span.traceId, rootSpan.traceId);
      assert.strictEqual(span.traceState, 'traceState');
    });

    it('should handle optional / undefined traceState', () => {
      const rootSpan = new RootSpan(tracer, name, kind, traceId, parentSpanId);
      rootSpan.start();
      assert.strictEqual(rootSpan.traceState, undefined);

      const span = new Span(tracer, rootSpan);
      assert.strictEqual(span.traceId, rootSpan.traceId);
      assert.strictEqual(span.traceState, undefined);
    });
  });
});
