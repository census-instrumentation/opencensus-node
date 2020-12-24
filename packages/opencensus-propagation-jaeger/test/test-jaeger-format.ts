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

import { HeaderGetter, HeaderSetter } from '@opencensus/core';
import * as assert from 'assert';
import { JaegerFormat, SAMPLED_VALUE, TRACER_STATE_HEADER_NAME } from '../src/';

function helperGetter(value: string | string[] | undefined) {
  const headers: { [key: string]: string | string[] | undefined } = {};
  headers[TRACER_STATE_HEADER_NAME] = value;
  const getter: HeaderGetter = {
    getHeader(name: string) {
      return headers[name];
    },
  };
  return getter;
}

const jaegerFormat = new JaegerFormat();

describe('JaegerPropagation', () => {
  describe('extract()', () => {
    it('should extract context of a sampled span from headers', () => {
      const spanContext = jaegerFormat.generate();
      const getter = helperGetter(
        `${spanContext.traceId}:${spanContext.spanId}::${spanContext.options}`
      );

      assert.deepStrictEqual(jaegerFormat.extract(getter), spanContext);
    });

    it('should return null when header is undefined', () => {
      const headers: { [key: string]: string | string[] | undefined } = {};
      headers[TRACER_STATE_HEADER_NAME] = undefined;

      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        },
      };

      assert.deepStrictEqual(jaegerFormat.extract(getter), null);
    });

    it('should extract data from an array', () => {
      const spanContext = jaegerFormat.generate();
      const getter = helperGetter(
        `${spanContext.traceId}:${spanContext.spanId}::${spanContext.options}`
      );
      assert.deepStrictEqual(jaegerFormat.extract(getter), spanContext);
    });

    it('should format traceId for 64Bit Hex id without leading zeros', () => {
      const spanContext = jaegerFormat.generate();
      spanContext.traceId = '70c2f20bd65603bd';
      const getter = helperGetter(
        `${spanContext.traceId}:${spanContext.spanId}::${spanContext.options}`
      );
      assert.deepStrictEqual(jaegerFormat.extract(getter), spanContext);
    });

    it('should format traceId for 64Bit Hex id with leading zeros when needed', () => {
      const spanContext = jaegerFormat.generate();
      spanContext.traceId = 'c2f20bd65603bd';
      const compareSpanContext = { ...spanContext };
      compareSpanContext.traceId = '00c2f20bd65603bd';
      const getter = helperGetter(
        `${spanContext.traceId}:${spanContext.spanId}::${spanContext.options}`
      );
      assert.deepStrictEqual(jaegerFormat.extract(getter), compareSpanContext);
    });

    it('should format traceId for 128Bit Hex id without leading zeros', () => {
      const spanContext = jaegerFormat.generate();
      spanContext.traceId = '929985345ae64c35acddd590f13ffc82';
      const getter = helperGetter(
        `${spanContext.traceId}:${spanContext.spanId}::${spanContext.options}`
      );
      assert.deepStrictEqual(jaegerFormat.extract(getter), spanContext);
    });

    it('should format traceId for 128Bit Hex id with leading zeros when needed', () => {
      const spanContext = jaegerFormat.generate();
      spanContext.traceId = '9985345ae64c35acddd590f13ffc82';
      const compareSpanContext = { ...spanContext };
      compareSpanContext.traceId = '009985345ae64c35acddd590f13ffc82';
      const getter = helperGetter(
        `${spanContext.traceId}:${spanContext.spanId}::${spanContext.options}`
      );
      assert.deepStrictEqual(jaegerFormat.extract(getter), compareSpanContext);
    });
  });

  it('should format spanId without leading zeros', () => {
    const spanContext = jaegerFormat.generate();
    spanContext.spanId = '70c2f20bd65603bd';
    const getter = helperGetter(
      `${spanContext.traceId}:${spanContext.spanId}::${spanContext.options}`
    );
    assert.deepStrictEqual(jaegerFormat.extract(getter), spanContext);
  });

  it('should format spanId with leading zeros when needed', () => {
    const spanContext = jaegerFormat.generate();
    spanContext.spanId = 'c2f20bd65603bd';
    const compareSpanContext = { ...spanContext };
    compareSpanContext.spanId = '00c2f20bd65603bd';
    const getter = helperGetter(
      `${spanContext.traceId}:${spanContext.spanId}::${spanContext.options}`
    );
    assert.deepStrictEqual(jaegerFormat.extract(getter), compareSpanContext);
  });

  describe('inject', () => {
    it('should inject a context of a sampled span', () => {
      const spanContext = jaegerFormat.generate();
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

      jaegerFormat.inject(setter, spanContext);
      assert.deepStrictEqual(jaegerFormat.extract(getter), spanContext);
    });

    it('should not inject empty spancontext', () => {
      const emptySpanContext = {
        traceId: '',
        spanId: '',
        options: SAMPLED_VALUE,
      };
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

      jaegerFormat.inject(setter, emptySpanContext);
      assert.deepStrictEqual(jaegerFormat.extract(getter), null);
    });

    it('should inject spancontext with 64Bit traceID', () => {
      const spanContext = {
        traceId: '70c2f20bd65603bd',
        spanId: '5ba4ceca5d0edd4c',
        options: SAMPLED_VALUE,
      };
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

      jaegerFormat.inject(setter, spanContext);
      assert.deepStrictEqual(jaegerFormat.extract(getter), spanContext);
    });

    it('should inject spancontext with 128Bit traceID', () => {
      const spanContext = {
        traceId: '929985345ae64c35acddd590f13ffc82',
        spanId: '5ba4ceca5d0edd4c',
        options: SAMPLED_VALUE,
      };
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

      jaegerFormat.inject(setter, spanContext);
      assert.deepStrictEqual(jaegerFormat.extract(getter), spanContext);
    });
  });

  // Same test as propagation-stackdriver.
  describe('generate', () => {
    const TIMES = 20;

    // Generate some span contexts.
    const GENERATED = Array.from({ length: TIMES })
      .fill(0)
      .map(_ => jaegerFormat.generate());

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
