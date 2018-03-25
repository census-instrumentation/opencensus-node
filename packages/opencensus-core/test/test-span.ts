/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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

import { Span } from '../src/trace/model/span';
import { RootSpan } from '../src/trace/model/rootspan';

var assert = require('assert');

describe('Span creation', function () {

    let root;
    let span;

    before(function () {
        root = new RootSpan();
        span = root.startSpan('spanName', 'typeSpan');
    });

    it('should create an span on the trace', function () {
        assert.ok(root instanceof RootSpan);
        span = root.startSpan('spanName', 'typeSpan');
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

    let root;
    let span;

    before(function () {
        root = new RootSpan();
        span = root.startSpan('spanName', 'typeSpan');
    });

    it('should not start span after it ended', function () {
        span.end();
        assert.equal(span.ended, true);
    });
});

describe('Span data', function () {

    let root;

    before(function () {
        root = new RootSpan();
    });

    it('generates unique numeric span ID strings', function () {
        var numberOfSpansToCheck = 5;
        for (var i = 0; i < numberOfSpansToCheck; i++) {
            var span = root.startSpan('spanName' + i, 'typeSpan' + i);
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

