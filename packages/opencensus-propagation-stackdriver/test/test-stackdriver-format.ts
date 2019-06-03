/**
 * Copyright 2019 OpenCensus Authors
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

import { HeaderGetter, HeaderSetter } from '@opencensus/core';
import * as assert from 'assert';
import { StackdriverFormat, TRACE_CONTEXT_HEADER_NAME } from '../src';

const stackdriverFormat = new StackdriverFormat();

function helperGetter(value: string | string[] | undefined) {
  const headers: { [key: string]: string | string[] | undefined } = {};
  headers[TRACE_CONTEXT_HEADER_NAME] = value;
  const getter: HeaderGetter = {
    getHeader(name: string) {
      return headers[name];
    },
  };
  return getter;
}

describe('StackdriverPropagation', () => {
  describe('extract()', () => {
    it('should extract context of a sampled span from headers', () => {
      const getter = helperGetter('123456/667;o=1');
      assert.deepStrictEqual(stackdriverFormat.extract(getter), {
        traceId: '123456',
        spanId: '000000000000029b',
        options: 1,
      });
    });

    it('should extract context of a span from headers when TRACE_TRUE set to 0', () => {
      const getter = helperGetter(
        '123456/123456123456123456123456123456123456;o=0'
      );
      assert.deepStrictEqual(stackdriverFormat.extract(getter), {
        traceId: '123456',
        spanId: 'a89bb45f10f2f240',
        options: 0,
      });
    });

    it('should extract context of a span from headers when option is undefined', () => {
      const getter = helperGetter('cafef00d/123');
      assert.deepStrictEqual(stackdriverFormat.extract(getter), {
        traceId: 'cafef00d',
        spanId: '000000000000007b',
        options: 1,
      });
    });

    const inputs = [
      '',
      undefined,
      '123456',
      '123456;o=1',
      'o=1;123456',
      '123;456;o=1',
      '123/o=1;456',
      '123/abc/o=1',
      'cafefood/667;o=1',
    ];
    inputs.forEach(s => {
      it(`should reject ${s}`, () => {
        const getter = helperGetter(s);
        const result = stackdriverFormat.extract(getter);
        assert.ok(!result);
      });
    });
  });

  describe('inject', () => {
    it('should inject a context of a sampled span', () => {
      const spanContext = stackdriverFormat.generate();
      const headers: { [key: string]: string | string[] | undefined } = {};
      const setter: HeaderSetter = {
        setHeader(name: string, value: string) {
          headers[name] = value;
        },
      };
      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        },
      };

      stackdriverFormat.inject(setter, spanContext);
      assert.deepStrictEqual(stackdriverFormat.extract(getter), spanContext);
    });

    it('should not inject empty spancontext', () => {
      const emptySpanContext = { traceId: '', spanId: '' };
      const headers: { [key: string]: string | string[] | undefined } = {};
      const setter: HeaderSetter = {
        setHeader(name: string, value: string) {
          headers[name] = value;
        },
      };
      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        },
      };

      stackdriverFormat.inject(setter, emptySpanContext);
      assert.deepStrictEqual(stackdriverFormat.extract(getter), null);
    });
  });

  describe('generate', () => {
    const TIMES = 20;

    // Generate some span contexts.
    const GENERATED = Array.from({ length: TIMES })
      .fill(0)
      .map(_ => stackdriverFormat.generate());

    it('should generate unique traceIds', () => {
      const traceIds = GENERATED.map(c => c.traceId);
      assert.strictEqual(new Set(traceIds).size, TIMES);
    });

    it('should generate unique spanIds', () => {
      const spanIds = GENERATED.map(c => c.spanId);
      assert.strictEqual(new Set(spanIds).size, TIMES);
    });
  });
});
