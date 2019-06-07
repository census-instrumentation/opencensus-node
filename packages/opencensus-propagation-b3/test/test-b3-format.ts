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
import * as uuid from 'uuid';

import {
  B3Format,
  NOT_SAMPLED_VALUE,
  SAMPLED_VALUE,
  X_B3_SAMPLED,
  X_B3_SPAN_ID,
  X_B3_TRACE_ID,
} from '../src/';

const b3Format = new B3Format();

describe('B3Propagation', () => {
  /** Should get the singleton trancing instance. */
  describe('extract()', () => {
    it('should extract context of a sampled span from headers', () => {
      const spanContext = b3Format.generate();
      // disable-next-line to disable no-any check
      // tslint:disable-next-line
      const headers = {} as any;
      headers[X_B3_TRACE_ID] = spanContext.traceId;
      headers[X_B3_SPAN_ID] = spanContext.spanId;
      headers[X_B3_SAMPLED] = spanContext.options;

      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        },
      };

      assert.deepStrictEqual(b3Format.extract(getter), spanContext);
    });

    it('should return null when options and spanId are undefined', () => {
      const traceId = uuid
        .v4()
        .split('-')
        .join('');
      // tslint:disable-next-line
      const headers = {} as any;
      headers[X_B3_TRACE_ID] = traceId;
      headers[X_B3_SPAN_ID] = undefined;

      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        },
      };

      assert.deepStrictEqual(b3Format.extract(getter), null);
    });

    it('should return null when traceId is undefined', () => {
      // tslint:disable-next-line
      const headers = {} as any;
      headers[X_B3_TRACE_ID] = undefined;
      headers[X_B3_SPAN_ID] = undefined;

      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        },
      };

      assert.deepStrictEqual(b3Format.extract(getter), null);
    });

    it('should extract data from an array', () => {
      const spanContext = b3Format.generate();
      // tslint:disable-next-line
      const headers = {} as any;
      headers[X_B3_TRACE_ID] = [
        spanContext.traceId,
        uuid
          .v4()
          .split('-')
          .join(''),
      ];
      headers[X_B3_SPAN_ID] = [spanContext.spanId];
      headers[X_B3_SAMPLED] = [SAMPLED_VALUE];

      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        },
      };

      assert.deepStrictEqual(b3Format.extract(getter), spanContext);
    });
  });

  describe('inject', () => {
    it('should inject a context of a sampled span', () => {
      const spanContext = b3Format.generate();
      // disable-next-line to disable no-any check
      // tslint:disable-next-line
      const headers = {} as any;
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

      b3Format.inject(setter, spanContext);
      assert.deepStrictEqual(b3Format.extract(getter), spanContext);
    });

    it('should not inject empty spancontext', () => {
      const emptySpanContext = {
        traceId: '',
        spanId: '',
        options: NOT_SAMPLED_VALUE,
      };
      // disable-next-line to disable no-any check
      // tslint:disable-next-line
      const headers = {} as any;
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

      b3Format.inject(setter, emptySpanContext);
      assert.deepStrictEqual(b3Format.extract(getter), null);
    });
  });

  // Same test as propagation-stackdriver.
  describe('generate', () => {
    const TIMES = 20;

    // Generate some span contexts.
    const GENERATED = Array.from({ length: TIMES })
      .fill(0)
      .map(_ => b3Format.generate());

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
