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

import {HeaderGetter, HeaderSetter, SpanContext} from '@opencensus/core';
import * as assert from 'assert';
import {DEFAULT_OPTIONS, TRACE_PARENT, TRACE_STATE, TraceContextFormat} from '../src/';

const traceContextFormat = new TraceContextFormat();

type Headers = Record<string, string|string[]>;

describe('TraceContextPropagation', () => {
  // Generates the appropriate `traceparent` header for the given SpanContext
  const traceParentHeaderFromSpanContext =
      (spanContext: SpanContext): string => {
        const {traceId, spanId} = spanContext;
        return `00-${traceId}-${spanId}-${
            Buffer.from([spanContext.options]).toString('hex')}`;
      };

  /** Should get the singleton trancing instance. */
  describe('extract()', () => {
    it('should extract context of a sampled span from headers', () => {
      const spanContext = traceContextFormat.generate();

      // Construct headers from the generated span context
      const headers: Record<string, string> = {};
      headers[TRACE_PARENT] = traceParentHeaderFromSpanContext(spanContext);
      if (spanContext.traceState) {
        headers[TRACE_STATE] = spanContext.traceState;
      }
      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        }
      };

      // Extract a span context from the constructed headers and verify that
      // the generated and extracted are deeply equal
      const extractedSpanContext = traceContextFormat.extract(getter);

      assert.deepEqual(extractedSpanContext, spanContext);
    });

    it('should gracefully handle multiple traceparent headers', () => {
      const firstContext = traceContextFormat.generate();

      const headers: Headers = {};
      headers[TRACE_PARENT] = [
        traceParentHeaderFromSpanContext(firstContext),
        traceParentHeaderFromSpanContext(traceContextFormat.generate()),
      ];
      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        }
      };

      // Extract a span context from the constructed headers and verify that
      // the generated and extracted are deeply equal to the first context that
      // is found in the headers.
      const extractedSpanContext = traceContextFormat.extract(getter);

      assert.deepEqual(extractedSpanContext, firstContext);
    });

    it('should gracefully handle an invalid traceparent header', () => {
      // A set of test cases with different invalid combinations of a
      // traceparent header. These should all result in a `null` SpanContext
      // value being extracted.
      //
      // List is generated from sections 2.2.2 and 2.2.5 of the Trace Context
      // spec.
      const testCases: Record<string, string> = {
        invalidParts_tooShort: '00-ffffffffffffffffffffffffffffffff',
        invalidParts_tooLong:
            '00-ffffffffffffffffffffffffffffffff-ffffffffffffffff-00-01',

        invalidVersion_notHex:
            '0x-ffffffffffffffffffffffffffffffff-ffffffffffffffff-00',
        invalidVersion_tooShort:
            '0-ffffffffffffffffffffffffffffffff-ffffffffffffffff-00',
        invalidVersion_tooLong:
            '000-ffffffffffffffffffffffffffffffff-ffffffffffffffff-00',

        invalidTraceId_empty: '00--ffffffffffffffff-01',
        invalidTraceId_notHex:
            '00-fffffffffffffffffffffffffffffffx-ffffffffffffffff-01',
        invalidTraceId_allZeros:
            '00-00000000000000000000000000000000-ffffffffffffffff-01',
        invalidTraceId_tooShort: '00-ffffffff-ffffffffffffffff-01',
        invalidTraceId_tooLong:
            '00-ffffffffffffffffffffffffffffffff00-ffffffffffffffff-01',

        invalidSpanId_empty: '00-ffffffffffffffffffffffffffffffff--01',
        invalidSpanId_notHex:
            '00-ffffffffffffffffffffffffffffffff-fffffffffffffffx-01',
        invalidSpanId_allZeros:
            '00-ffffffffffffffffffffffffffffffff-0000000000000000-01',
        invalidSpanId_tooShort:
            '00-ffffffffffffffffffffffffffffffff-ffffffff-01',
        invalidSpanId_tooLong:
            '00-ffffffffffffffffffffffffffffffff-ffffffffffffffff0000-01',
      };

      Object.getOwnPropertyNames(testCases).forEach(testCase => {
        const headers: Headers = {
          [TRACE_PARENT]: testCases[testCase],
          [TRACE_STATE]: '',
        };
        const getter: HeaderGetter = {
          getHeader(name: string) {
            return headers[name];
          }
        };

        const extractedSpanContext = traceContextFormat.extract(getter);
        assert.deepEqual(extractedSpanContext, null, testCase);
      });
    });

    it('should reset options if they are invalid', () => {
      const testCases: Record<string, string> = {
        invalidOptions_empty:
            '00-ffffffffffffffffffffffffffffffff-ffffffffffffffff-',
        invalidOptions_notHex:
            '00-ffffffffffffffffffffffffffffffff-ffffffffffffffff-0x',
        invalidOptions_tooShort:
            '00-ffffffffffffffffffffffffffffffff-ffffffffffffffff-0',
        invalidOptions_tooLong:
            '00-ffffffffffffffffffffffffffffffff-ffffffffffffffff-0f0',
      };

      Object.getOwnPropertyNames(testCases).forEach(testCase => {
        const headers: Headers = {
          [TRACE_PARENT]: testCases[testCase],
          [TRACE_STATE]: '',
        };
        const getter: HeaderGetter = {
          getHeader(name: string) {
            return headers[name];
          }
        };

        const extractedSpanContext = traceContextFormat.extract(getter);
        if (extractedSpanContext !== null) {
          assert.strictEqual(
              extractedSpanContext.options, DEFAULT_OPTIONS, testCase);
        }
      });
    });

    it('should handle multiple tracestate headers', () => {
      const spanContext = traceContextFormat.generate();
      const traceStateHeaders = ['foo=bar,baz=qux', 'quux=quuz'];
      spanContext.traceState = traceStateHeaders.join(',');
      const headers: Headers = {
        [TRACE_PARENT]: traceParentHeaderFromSpanContext(spanContext),
        [TRACE_STATE]: traceStateHeaders
      };
      const getter: HeaderGetter = {
        getHeader(name: string) {
          return headers[name];
        }
      };

      const extractedSpanContext = traceContextFormat.extract(getter);
      assert.deepEqual(extractedSpanContext, spanContext);
    });

    it('should gracefully handle an unset header', () => {
      const getter: HeaderGetter = {
        getHeader(name: string) {
          return undefined;
        }
      };

      const extractedSpanContext = traceContextFormat.extract(getter);
      assert.deepEqual(extractedSpanContext, null);
    });
  });

  describe('inject', () => {
    it('should inject a context of a sampled span', () => {
      const spanContext = traceContextFormat.generate();
      const headers: Headers = {};
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

      traceContextFormat.inject(setter, spanContext);
      assert.deepEqual(traceContextFormat.extract(getter), spanContext);
    });

    it('should inject a tracestate header', () => {
      const spanContext: SpanContext = {
        traceId: '',
        spanId: '',
        options: DEFAULT_OPTIONS,
        traceState: 'foo=bar'
      };
      const headers: Headers = {};
      const setter: HeaderSetter = {
        setHeader(name: string, value: string) {
          headers[name] = value;
        }
      };

      traceContextFormat.inject(setter, spanContext);
      assert.strictEqual(headers[TRACE_STATE], 'foo=bar');
    });
  });

  describe('generate', () => {
    const TIMES = 20;

    // Generate some span contexts.
    const GENERATED = Array.from({length: TIMES})
                          .fill(0)
                          .map(_ => traceContextFormat.generate());

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
