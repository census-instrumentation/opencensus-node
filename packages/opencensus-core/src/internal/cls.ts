/**
 * Copyright 2018 Google LLC
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

// Original file from Stackdriver Trace Agent for Node.js
// https://github.com/GoogleCloudPlatform/cloud-trace-nodejs

import * as CLS from 'cls-hooked';

export type Namespace = CLS.Namespace;
// tslint:disable-next-line:no-any
export type Func<T> = (...args: any[]) => T;

const TRACE_NAMESPACE = 'opencensus.io';

export function createNamespace(): CLS.Namespace {
  return CLS.createNamespace(TRACE_NAMESPACE);
}

export function destroyNamespace(): void {
  CLS.destroyNamespace(TRACE_NAMESPACE);
}

export function getNamespace(): CLS.Namespace {
  return CLS.getNamespace(TRACE_NAMESPACE);
}

export const contextManager = createNamespace();
