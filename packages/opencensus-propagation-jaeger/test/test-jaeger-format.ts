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

import {HeaderGetter, HeaderSetter} from '@opencensus/core';
import * as assert from 'assert';

import {JaegerFormat} from '../src/';

const TRACE_ID_HEADER = 'uber-trace-id';

const SAMPLED_VALUE = 0x1;
const NOT_SAMPLED_VALUE = 0x0;

const jaegerFormat = new JaegerFormat();

describe('JaegerPropagation', () => {
  describe('extract()', () => {
    it('should extract context of a sampled span from headers', () => {
      const spanContext = jaegerFormat.generate();
      // disable-next-line to disable no-any check
      // tslint:disable-next-line
      const headers = {} as any;
      headers[TRACE_ID_HEADER] = `${spanContext.traceId}:${
          spanContext.spanId}::${spanContext.options}`;

      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        }
      };

      assert.deepEqual(jaegerFormat.extract(getter), spanContext);
    });
  });

  describe('inject', () => {
    it('should inject a context of a sampled span', () => {
      const spanContext = jaegerFormat.generate();
      // disable-next-line to disable no-any check
      // tslint:disable-next-line
      const headers = {} as any;
      const setter: HeaderSetter = {
        setHeader(name: string, value: string) {
          headers[name] = value;
        }
      };
      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        }
      };

      jaegerFormat.inject(setter, spanContext);
      assert.deepEqual(jaegerFormat.extract(getter), spanContext);
    });
  });


  // Same test as propagation-stackdriver.
  describe('generate', () => {
    const TIMES = 20;

    // Generate some span contexts.
    const GENERATED =
        Array.from({length: TIMES}).fill(0).map(_ => jaegerFormat.generate());

    it('should generate unique traceIds', () => {
      const traceIds = GENERATED.map(c => c.traceId);
      assert.strictEqual((new Set(traceIds)).size, TIMES);
    });

    it('should generate unique spanIds', () => {
      const spanIds = GENERATED.map(c => c.spanId);
      assert.strictEqual((new Set(spanIds)).size, TIMES);
    });
  });
});
