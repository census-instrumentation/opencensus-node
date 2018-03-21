import { Trace } from '../src/trace/trace';
import { Span } from '../src/trace/span';

let assert = require('assert');

describe('Trace', function () {
  let trace = new Trace();

  describe('new Trace()', function () {
    it('should be a Trace instance', function () {      
      assert.ok(trace instanceof Trace);
    });
  });

  describe('start()', function () {
    it('trace was started', function () {
      trace.start()
      assert.ok(trace.started);
    });
  });

  describe('startSpan()', function () {
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
      trace.end();
      assert.ok(trace.ended);
    });
  });

  describe('startSpan() after ended trace', function () {
    it('should throws an exception', function () {
      assert.throws(() => trace.startSpan("spanName", "spanType"));
    });
  });

});