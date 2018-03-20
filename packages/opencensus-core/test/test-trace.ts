import { Trace } from '../src/trace/trace';

var assert = require('assert');

describe('Trace', function() {
  it('should be a Trace instance', function() {
    var trace = new Trace();
    assert.ok(trace instanceof Trace);
  });
});