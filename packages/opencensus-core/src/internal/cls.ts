/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import * as CLS from 'continuation-local-storage';
import * as semver from 'semver';

import * as cls_ah from './cls-ah';

export type Namespace = CLS.Namespace;
export type Func<T> = CLS.Func<T>;

const useAsyncHooks: boolean = semver.satisfies(
    process.version, '>=8');  //&&
                              // !!process.env.GCLOUD_TRACE_NEW_CONTEXT;

import * as Debug from 'debug';
const debug = Debug('opencensus');
debug('useAsyncHooks = %s', useAsyncHooks);

const cls: typeof CLS =
    useAsyncHooks ? cls_ah : CLS;


const TRACE_NAMESPACE = 'opencensus.io';

/**
 * Stack traces are captured when a root span is started. Because the stack
 * trace height varies on the context propagation mechanism, to keep published
 * stack traces uniform we need to remove the top-most frames when using the
 * c-l-s module. Keep track of this number here.
 */
export const ROOT_SPAN_STACK_OFFSET = useAsyncHooks ? 0 : 2;

export function createNamespace(): CLS.Namespace {
  return cls.createNamespace(TRACE_NAMESPACE);
}

export function destroyNamespace(): void {
  cls.destroyNamespace(TRACE_NAMESPACE);
}

export function getNamespace(): CLS.Namespace {
  return cls.getNamespace(TRACE_NAMESPACE);
}
