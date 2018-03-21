import { Trace } from '../src/trace/trace';
import { Span } from '../src/trace/span';

let assert = require('assert');

describe('Trace', function () {
  describe('new Trace()', function () {    
    it('should be a Trace instance', function () {
      let trace = new Trace();
      assert.ok(trace instanceof Trace);
    });
  });

  describe('start()', function () {
    it('trace was started', function () {
      let trace = new Trace();
      trace.start();
      assert.ok(trace.started);
    });
  });

  describe('startSpan()', function () {
    let trace = new Trace();
    trace.start()
    let span = trace.startSpan("spanName", "spanType");
    it('should be a Span instance', function () {
      assert.ok(span instanceof Span);
    });

    it('span was started', function () {
      assert.ok(span.started);
    });
  });

  describe('end()', function () {
    it('trace was ended', function () {
      let trace = new Trace();
      trace.start()
      trace.end();
      assert.ok(trace.ended);
    });
  });

  describe('end() before trace started', function () {
    it('trace was not ended', function () {
      let trace = new Trace();
      trace.end();
      assert.ok(!trace.ended);
    });
  });

  describe('startSpan() before trace started', function () {
    it('should return null', function () {
      let trace = new Trace();
      let span = trace.startSpan("spanName", "spanType");
      assert.ok(span == null);
    });
  });

  describe('startSpan() after trace ended', function () {
    it('should return null', function () {
      let trace = new Trace();
      trace.start()
      trace.end();
      let span = trace.startSpan("spanName", "spanType");
      assert.ok(span == null);
    });
  });

});