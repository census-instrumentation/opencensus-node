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

import {RootSpan} from '../src/trace/model/root-span';
import {Span} from '../src/trace/model/span';
import {Tracer} from '../src/trace/model/tracer';
import * as types from '../src/trace/model/types';
import {Annotation, Attributes, Link, MessageEvent} from '../src/trace/model/types';


// TODO: we should evaluate a way to merge similar test cases between span and
// rootspan

const tracer = new Tracer();

describe('Span', () => {
  /**
   * Should create a span
   */
  describe('new Span()', () => {
    it('should create a Span instance', () => {
      const rootSpan = new RootSpan(tracer);
      const span = new Span(rootSpan);
      assert.ok(span instanceof Span);
    });
  });

  /**
   * Should return the Trace ID
   */
  describe('get traceId()', () => {
    it('should return the trace id', () => {
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();
      const span = new Span(rootSpan);
      assert.equal(span.traceId, rootSpan.traceId);
    });
  });

  /**
   * Should the span context of span
   */
  describe('get spanContext', () => {
    it('should the span context of span', () => {
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();

      const span = new Span(rootSpan);
      const context = span.spanContext;

      assert.equal(context.traceId, rootSpan.traceId);
      assert.equal(context.spanId, span.id);
      assert.equal(context.options, 1);
    });
  });

  /**
   * startTime, endTime and durantion proprieties called before start() - no
   * clock instance created
   */
  describe('get time properties before start()', () => {
    let span: types.Span;
    before(() => {
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();
      span = new Span(rootSpan);
    });
    it('should get startTime() return null', () => {
      assert.strictEqual(span.startTime, null);
    });
    it('should get endTime() return null', () => {
      assert.strictEqual(span.endTime, null);
    });
    it('should get duration() return null', () => {
      assert.strictEqual(span.duration, null);
    });
  });

  /**
   * Should start a span instance
   */
  describe('start()', () => {
    it('should start a span instance', () => {
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();

      const span = new Span(rootSpan);
      span.start();

      assert.ok(span.started);
    });
  });

  /**
   * Should not change the initial startTime
   */
  describe('start() an already started span', () => {
    it('should not change the initial startTime', () => {
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();
      const span = new Span(rootSpan);
      span.start();
      const initialStartTime = span.startTime;
      span.start();

      assert.equal(span.startTime, initialStartTime);
    });
  });

  /**
   * Should end a span instance
   */
  describe('end()', () => {
    it('should end a span instance', () => {
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();

      const span = new Span(rootSpan);
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
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();

      const span = new Span(rootSpan);
      span.end();

      assert.ok(!span.ended);
    });
  });

  /**
   * Should not change the endTime
   */
  describe('end() an already ended span', () => {
    it('should not change the endTime', () => {
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();
      const span = new Span(rootSpan);
      span.start();
      span.end();
      const initialEndTime = span.endTime;
      span.end();

      assert.equal(span.endTime.getTime(), initialEndTime.getTime());
    });
  });

  /**
   * Should add an attrinbutes
   */
  describe('addAtribute()', () => {
    it('should add an attribute', () => {
      const rootSpan = new RootSpan(tracer);
      rootSpan.start();

      const span = new Span(rootSpan);
      span.start();

      ['String', 'Number', 'Boolean'].map(attType => {
        span.addAttribute('testKey' + attType, 'testValue' + attType);
        assert.equal(
            span.attributes['testKey' + attType], 'testValue' + attType);
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

      const span = new Span(rootSpan);
      span.start();

      span.addAnnotation('description test', Date.now(), {} as Attributes);

      assert.ok(span.annotations.length > 0);
      assert.ok(instanceOfAnnotation(span.annotations[0]));
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

      const LINK_TYPE = 'PARENT_LINKED_SPAN';
      span.addLink(span.traceId, rootSpan.id, LINK_TYPE);

      assert.ok(span.links.length > 0);
      assert.ok(instanceOfLink(span.links[0]));
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

      const span = new Span(rootSpan);
      span.start();

      span.addMessageEvent('TYPE_UNSPECIFIED', 'message_event_test_id');

      assert.ok(span.messageEvents.length > 0);
      assert.ok(instanceOfLink(span.messageEvents[0]));
    });
  });
});