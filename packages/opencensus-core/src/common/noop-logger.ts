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

import { Logger } from './types';

/** No-op implementation of Logger */
class NoopLogger implements Logger {
  // tslint:disable-next-line:no-any
  debug(message: string, ...args: any[]) {}
  // tslint:disable-next-line:no-any
  error(...args: any[]) {}
  // tslint:disable-next-line:no-any
  warn(...args: any[]) {}
  // tslint:disable-next-line:no-any
  info(...args: any[]) {}
}

export const noopLogger = new NoopLogger();
