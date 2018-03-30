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
import { SpanBaseModel } from '../src/trace/types/tracetypes';
import { Tracer } from '../src/trace/model/tracer';


var assert = require('assert');

let tracer = new Tracer()

describe('Span', function () {

describe('startSpan()', function () {

    it('should create an span', function () {
        const rootSpan = new RootSpan(tracer);
        assert.ok(rootSpan instanceof SpanBaseModel);

        rootSpan.start();
        const span = rootSpan.startSpan('spanName', 'typeSpan');
        assert.ok(span instanceof Span);
        assert.ok(span.id);
    });

    it('should start a span', function () {
        const rootSpan = new RootSpan(tracer);
        rootSpan.start();
        const span = rootSpan.startSpan('spanName', 'typeSpan');
        span.start();
        assert.ok(span.started);
    });

    it('should end a span', function () {
        const rootSpan = new RootSpan(tracer);
        rootSpan.start();
        const span = rootSpan.startSpan('spanName', 'typeSpan');
        span.start();
        span.end();
        assert.ok(span.ended);
    });
});

describe('Span checking after creation', function () {

    it('should not start span after it ended', function () {
        const root = new RootSpan(tracer);
        root.start();
        const span = root.startSpan('spanName', 'typeSpan');
        span.start();
        span.end();

        span.start();
        assert.equal(span.ended, true);
    });
});

describe('Span data', function () {

    it('should create an unique numeric span ID strings', function () {
        const root = new RootSpan(tracer);
        root.start();

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
    it('should truncate namespace', function () {
        this.skip();
    });
});

});