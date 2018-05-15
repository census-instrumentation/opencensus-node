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

import {types} from '@opencensus/opencensus-core';
import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';
import * as assert from 'assert';

import {B3Format} from '../src/b3Format';

const X_B3_TRACE_ID = 'x-b3-traceid';
const X_B3_SPAN_ID = 'x-b3-spanid';
const X_B3_PARENT_SPAN_ID = 'x-x3-parentspanid';
const X_B3_SAMPLED = 'x-b3-sampled';

const SAMPLED_VALUE = 0x1;
const NOT_SAMPLED_VALUE = 0x0;

const b3Format = new B3Format();

describe('B3Propagation', () => {
  /** Should get the singleton trancing instance. */
  describe('extract()', () => {
    it('should extract context of a sampled span from headers', () => {
      // tslint:disable:no-any
      const spanContext = b3Format.generate();
      const headers = {} as any;
      headers[X_B3_TRACE_ID] = spanContext.traceId;
      headers[X_B3_SPAN_ID] = spanContext.spanId;
      headers[X_B3_SAMPLED] = spanContext.options;

      const getter = {
        getHeader(name: string) {
          return headers[name];
        }
      } as types.HeaderGetter;

      assert.deepEqual(b3Format.extract(getter), spanContext);
    });
  });

  describe('inject', () => {
    it('should inject a context of a sampled span', () => {
      const spanContext = b3Format.generate();
      const headers = {} as any;
      const setter = {
        setHeader(name: string, value: string) {
          headers[name] = value;
        }
      };
      const getter = {
        getHeader(name: string) {
          return headers[name];
        }
      } as types.HeaderGetter;

      b3Format.inject(setter, spanContext);
      assert.deepEqual(b3Format.extract(getter), spanContext);
    });
  });


  // Same test as propagation-stackdriver.
  describe('generate', () => {
    const TIMES = 20;

    // Generate some span contexts.
    const GENERATED =
        Array.from({length: TIMES}).fill(0).map(_ => b3Format.generate());

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
