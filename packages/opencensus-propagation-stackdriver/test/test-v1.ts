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

import * as assert from 'assert';
import * as mocha from 'mocha';
import {inspect} from 'util';

import {SpanContext} from '../src/index';
import {extract, inject} from '../src/v1';

const notNull = <T>(x: T|null|undefined): T => {
  assert.notStrictEqual(x, null);
  assert.notStrictEqual(x, undefined);
  return x as T;
};

describe('extract', () => {
  describe('valid inputs', () => {
    it('should return expected values: cafef00d/667;o=1', () => {
      const getter = {
        getHeader() {
          return 'cafef00d/667;o=1';
        }
      };
      const result = notNull(extract(getter));
      assert.strictEqual(result.traceId, 'cafef00d');
      assert.strictEqual(result.spanId, '667');
      assert.strictEqual(result.options, 1);
    });

    it('should return expected values:' +
           '123456/123456123456123456123456123456123456;o=1',
       () => {
         const getter = {
           getHeader() {
             return '123456/123456123456123456123456123456123456;o=1';
           }
         };
         const result = notNull(extract(getter));
         assert.strictEqual(result.traceId, '123456');
         assert.strictEqual(
             result.spanId, '123456123456123456123456123456123456');
         assert.strictEqual(result.options, 1);
       });

    it('should return expected values: 123456/667', () => {
      const getter = {
        getHeader() {
          return '123456/667';
        }
      };
      const result = notNull(extract(getter));
      assert.strictEqual(result.traceId, '123456');
      assert.strictEqual(result.spanId, '667');
      assert.strictEqual(result.options, undefined);
    });
  });

  describe('invalid inputs', () => {
    const inputs = [
      '', null, undefined, '123456', '123456;o=1', 'o=1;123456', '123;456;o=1',
      '123/o=1;456', '123/abc/o=1', 'cafefood/667;o=1'
    ];
    inputs.forEach(s => {
      it(`should reject ${s}`, () => {
        const getter = {
          getHeader() {
            // tslint:disable-next-line:no-any
            return s as any;
          }
        };
        const result = extract(getter);
        assert.ok(!result);
      });
    });
  });
});

describe('inject', () => {
  interface TestData {
    input: SpanContext;
    output: string;
  }
  const testData: TestData[] = [
    {
      input: {traceId: '123456', spanId: '667', options: 1},
      output: '123456/667;o=1'
    },
    {
      input: {traceId: '123456', spanId: '667', options: undefined},
      output: '123456/667'
    },
    {input: {traceId: '123456', spanId: '667'}, output: '123456/667'}
  ];

  testData.forEach(({input, output}) => {
    it(`returns well-formatted trace context for ${inspect(input)}`, () => {
      const setter = {
        setHeader(name: string, value: string) {
          assert.deepEqual(value, output);
        }
      };
      inject(setter, input);
    });
  });
});
