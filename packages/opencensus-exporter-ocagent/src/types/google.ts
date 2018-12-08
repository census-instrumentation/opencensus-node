/**
 * Copyright 2018, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 the "License";
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

// tslint:disable:no-namespace

export namespace google.protobuf {
  export interface Timestamp {
    seconds?: number|Long|null;
    nanos?: number|null;
  }

  export interface DoubleValue {
    value?: number|null;
  }

  export interface FloatValue {
    value?: number|null;
  }
  export interface Int64Value {
    value?: number|Long|null;
  }

  export interface UInt64Value {
    value?: number|Long|null;
  }

  export interface Int32Value {
    value?: number|null;
  }

  export interface UInt32Value {
    value?: number|null;
  }

  export interface BoolValue {
    value?: boolean|null;
  }

  export interface StringValue {
    value?: string|null;
  }

  export interface BytesValue {
    value?: Uint8Array|null;
  }
}
