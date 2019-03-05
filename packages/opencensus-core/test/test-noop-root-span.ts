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

const tracer = new CoreTracer();

describe('NoopRootSpan()', () => {
  it('do not crash', () => {
    const noopRootSpan = new NoopRootSpan(tracer);
    noopRootSpan.addAnnotation('MyAnnotation');
    noopRootSpan.addAnnotation('MyAnnotation', {myString: 'bar'});
    noopRootSpan.addAnnotation(
        'MyAnnotation', {myString: 'bar', myNumber: 123, myBoolean: true});
    noopRootSpan.addLink('aaaaa', 'aaa', LinkType.CHILD_LINKED_SPAN);
    noopRootSpan.addMessageEvent(MessageEventType.RECEIVED, 'aaaa', 123456789);
    noopRootSpan.addAttribute('my_first_attribute', 'foo');
    noopRootSpan.setStatus(CanonicalCode.OK);
    noopRootSpan.startChildSpan();
  });
});
