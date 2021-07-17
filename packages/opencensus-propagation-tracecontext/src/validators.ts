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

type ValidationFn = (value: string) => boolean;

/**
 * Determines if the given hex string is truely a hex value. False if value is
 * null.
 * @param value
 */
const isHex: ValidationFn = (value: string): boolean => {
  return typeof value === 'string' && /^[0-9A-F]*$/i.test(value);
};

/**
 * Determines if the given hex string is all zeros. False if value is null.
 * @param value
 */
const isNotAllZeros: ValidationFn = (value: string): boolean => {
  return typeof value === 'string' && !/^[0]*$/i.test(value);
};

/**
 * Determines if the given hex string is of the given length. False if value is
 * null.
 * @param value
 */
const isLength = (length: number): ValidationFn => {
  return (value: string): boolean => {
    return typeof value === 'string' && value.length === length;
  };
};

/**
 * Compose a set of validation functions into a single validation call.
 */
const compose = (...fns: ValidationFn[]): ValidationFn => {
  // @ts-expect-error ts-migrate(2322) FIXME: Type '(value: string) => ValidationFn' is not assi... Remove this comment to see the full error message
  return (value: string) => {
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    return fns.reduce((isValid, fn) => isValid && fn(value), true);
  };
};

/**
 * Determines if the given version is valid based on section 2.2.5 of the Trace
 * Context spec. Noteably, we do not attempt to restrict the actual value of
 * the version. If the version is parsable as hex and of length 2, we will
 * attempt to parse the header. This is per section 2.2.5 of the spec.
 */
export const isValidVersion = compose(
  isHex,
  isLength(2)
);

/**
 * Determines if the given traceId is valid based on section 2.2.2.1 of the
 * Trace Context spec.
 */
export const isValidTraceId = compose(
  isHex,
  isNotAllZeros,
  isLength(32)
);

/**
 * Determines if the given spanId is valid based on section 2.2.2.2 of the Trace
 * Context spec.
 */
export const isValidSpanId = compose(
  isHex,
  isNotAllZeros,
  isLength(16)
);

/**
 * Determines if the given option is valid based on section 2.2.3 of the Trace
 * Context spec.
 */
export const isValidOption = compose(
  isHex,
  isLength(2)
);
