import { Span } from '../src/trace/span';
import { Trace } from '../src/trace/trace';

var assert = require('assert');

describe('Span creation', function () {

    let trace;
    let span;

    before(function () {
        trace = new Trace();
        span = trace.startSpan('spanName', 'typeSpan');
    });

    it('should create an span on the trace', function () {
        assert.ok(trace instanceof Trace);
        span = trace.startSpan('spanName', 'typeSpan');
        assert.ok(span instanceof Span);
        assert.ok(span.id);
    });

    it('should start a span', function () {
        span.start();
        assert.ok(span.started);
    });

    it('should end a span', function () {
        span.end();
        assert.ok(span.ended);
    });
});

describe('Span checking creation', function () {

    let trace;
    let span;

    before(function () {
        trace = new Trace();
        span = trace.startSpan('spanName', 'typeSpan');
    });

    it('should not start span after it ended', function () {
        span.end();
        assert.equal(span.ended, true);
    });
});

describe('Span data', function () {

    let trace;

    before(function () {
        trace = new Trace();
    });

    it('generates unique numeric span ID strings', function () {
        var numberOfSpansToCheck = 5;
        for (var i = 0; i < numberOfSpansToCheck; i++) {
            var span = trace.startSpan('spanName' + i, 'typeSpan' + i);
            var spanId = span.id;
            assert.ok(typeof spanId === 'string');
            assert.ok(spanId.match(/\d+/));
            assert.ok(Number(spanId) > 0);
            assert.strictEqual(Number(spanId).toString(), spanId);
        }
    });

    // TODO
    it('truncates namespace', function(){
        this.skip();
    });
});

