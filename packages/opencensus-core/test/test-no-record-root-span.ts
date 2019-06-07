/**
 * Copyright 2019, OpenCensus Authors
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
import {
  CanonicalCode,
  CoreTracer,
  LinkType,
  MessageEventType,
  SpanKind,
} from '../src';
import { NoRecordRootSpan } from '../src/trace/model/no-record/no-record-root-span';

const tracer = new CoreTracer();

describe('NoRecordRootSpan()', () => {
  it('do not crash', () => {
    const noRecordRootSpan = new NoRecordRootSpan(
      tracer,
      'name',
      SpanKind.SERVER,
      'traceid',
      ''
    );
    noRecordRootSpan.addAnnotation('MyAnnotation');
    noRecordRootSpan.addAnnotation('MyAnnotation', { myString: 'bar' });
    noRecordRootSpan.addAnnotation('MyAnnotation', {
      myString: 'bar',
      myNumber: 123,
      myBoolean: true,
    });
    noRecordRootSpan.addLink('aaaaa', 'aaa', LinkType.CHILD_LINKED_SPAN);
    noRecordRootSpan.addMessageEvent(MessageEventType.RECEIVED, 1, 123456789);
    noRecordRootSpan.addAttribute('my_first_attribute', 'foo');
    noRecordRootSpan.setStatus(CanonicalCode.OK);
    noRecordRootSpan.startChildSpan();
    assert.strictEqual(noRecordRootSpan.traceState, undefined);
  });
});
