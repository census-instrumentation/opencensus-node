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

import {CanonicalCode, CoreTracer, LinkType, MessageEventType} from '../src';
import {NoopRootSpan} from '../src/trace/model/no-op/noop-root-span';
import {NoopSpan} from '../src/trace/model/no-op/noop-span';

const tracer = new CoreTracer();

describe('NoopSpan()', () => {
  it('do not crash', () => {
    const root = new NoopRootSpan(tracer);
    const noopSpan = new NoopSpan(root);
    noopSpan.addAnnotation('MyAnnotation');
    noopSpan.addAnnotation('MyAnnotation', {myString: 'bar'});
    noopSpan.addAnnotation(
        'MyAnnotation', {myString: 'bar', myNumber: 123, myBoolean: true});
    noopSpan.addLink('aaaaa', 'aaa', LinkType.CHILD_LINKED_SPAN);
    noopSpan.addMessageEvent(MessageEventType.RECEIVED, 'aaaa', 123456789);
    noopSpan.addAttribute('my_first_attribute', 'foo');
    noopSpan.setStatus(CanonicalCode.OK);
  });
});
