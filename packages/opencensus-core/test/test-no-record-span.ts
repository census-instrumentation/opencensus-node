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
import { CoreTracerBase } from '../src/trace/model/tracer-base';
import { CanonicalCode, LinkType, MessageEventType } from '../src';
import { NoRecordSpan } from '../src/trace/model/no-record/no-record-span';

describe('NoRecordSpan()', () => {
  it('do not crash', () => {
    const tracer = new CoreTracerBase();
    const noRecordSpan = new NoRecordSpan(tracer);
    noRecordSpan.addAnnotation('MyAnnotation');
    noRecordSpan.addAnnotation('MyAnnotation', { myString: 'bar' });
    noRecordSpan.addAnnotation('MyAnnotation', {
      myString: 'bar',
      myNumber: 123,
      myBoolean: true,
    });
    noRecordSpan.addLink('aaaaa', 'aaa', LinkType.CHILD_LINKED_SPAN);
    noRecordSpan.addMessageEvent(MessageEventType.RECEIVED, 1, 123456789);
    noRecordSpan.addAttribute('my_first_attribute', 'foo');
    noRecordSpan.setStatus(CanonicalCode.OK);
    assert.strictEqual(noRecordSpan.traceState, undefined);
  });
});
