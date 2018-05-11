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

import * as v1API from './v1';

export interface SpanContext {
  /** Trace ID */
  traceId: string;
  /** Span ID */
  spanId: string;
  /** Options */
  options?: number;
}

/**
 * An transport and environment neutral API for getting request headers.
 */
export interface HeaderGetter {
  getHeader(name: string): string|string[]|undefined;
}

/**
 * A transport and environment neutral API for setting headers.
 */
export interface HeaderSetter {
  setHeader(name: string, value: string): void;
}


export interface Propagation {
  extract(getter: HeaderGetter): SpanContext|null;
  inject(setter: HeaderSetter, spanContext: SpanContext): void;
  generate(): SpanContext;
}

export const v1: Propagation = {
  extract: v1API.extract,
  inject: v1API.inject,
  generate: v1API.generate
};

// Also export the v1 API as the default API.
export const extract = v1.extract;
export const inject = v1.inject;
export const generate = v1.generate;
