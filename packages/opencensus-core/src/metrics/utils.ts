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

import { LabelValue } from './export/types';
import {
  LengthAttributeInterface,
  LengthMethodInterface,
  SizeAttributeInterface,
  SizeMethodInterface,
  ToValueInterface,
} from './types';

const COMMA_SEPARATOR = ',';
const UNSET_LABEL_VALUE: LabelValue = {
  value: null,
};

/**
 * Returns a string(comma separated) from the list of label values.
 *
 * @param labelValues The list of the label values.
 * @returns The hashed label values string.
 */
export function hashLabelValues(labelValues: LabelValue[]): string {
  return labelValues
    .map(lv => lv.value)
    .sort()
    .join(COMMA_SEPARATOR);
}

/**
 * Returns default label values.
 *
 * @param count The number of label values.
 * @returns The list of the label values.
 */
export function initializeDefaultLabels(count: number): LabelValue[] {
  return new Array(count).fill(UNSET_LABEL_VALUE);
}

// TODO(mayurkale): Consider to use unknown type instead of any for below
// functions, unknown type is available since TypeScript 3.0
// Fact: unknown acts like a type-safe version of any by requiring us to
// perform some type of checking before we can use the value of the unknown
// element or any of its properties.

// Checks if the specified collection is a LengthAttributeInterface.
export function isLengthAttributeInterface(
  // tslint:disable-next-line:no-any
  obj: any
): obj is LengthAttributeInterface {
  return obj && typeof obj.length === 'number';
}

// Checks if the specified collection is a LengthMethodInterface.
export function isLengthMethodInterface(
  // tslint:disable-next-line:no-any
  obj: any
): obj is LengthMethodInterface {
  return obj && typeof obj.length === 'function';
}

// Checks if the specified collection is a SizeAttributeInterface.
export function isSizeAttributeInterface(
  // tslint:disable-next-line:no-any
  obj: any
): obj is SizeAttributeInterface {
  return obj && typeof obj.size === 'number';
}

// Checks if the specified collection is a SizeMethodInterface.
// tslint:disable-next-line:no-any
export function isSizeMethodInterface(obj: any): obj is SizeMethodInterface {
  return obj && typeof obj.size === 'function';
}

// Checks if the specified callbackFn is a ToValueInterface.
// tslint:disable-next-line:no-any
export function isToValueInterface(obj: any): obj is ToValueInterface {
  return obj && typeof obj.getValue === 'function';
}
