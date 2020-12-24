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
  return (value: string) => {
    return fns.reduce((isValid, fn) => isValid && fn(value), true);
  };
};

/**
 * Compose a set of validation functions into a single validation call.
 */
const orCompose = (...fns: ValidationFn[]): ValidationFn => {
  return (value: string) => {
    return fns.reduce((isValid, fn) => isValid || fn(value), false);
  };
};

/**
 * Determines if the given traceId is valid based on https://www.jaegertracing.io/docs/1.21/client-libraries/#value
 */
export const isValidTraceId = compose(
  isHex,
  isNotAllZeros,
  orCompose(isLength(32), isLength(16))
);

/**
 * Determines if the given spanId is valid based on https://www.jaegertracing.io/docs/1.21/client-libraries/#value
 */
export const isValidSpanId = compose(
  isHex,
  isNotAllZeros,
  isLength(16)
);

/**
 * Determines if the given option is valid based on https://www.jaegertracing.io/docs/1.21/client-libraries/#value
 */
export const isValidOption = compose(
  isHex,
  isLength(2)
);

/**
 * Formats a traceId to 64Bit or 128Bit Hex and add leading zeroes
 */
export const formatTraceId = (id: string) => {
  if (id.length > 16) {
    return ('0000000000000000000000000000000' + id).substr(-32);
  }
  return ('000000000000000' + id).substr(-16);
};

/**
 * Formats a spanId to 64Bit and add leading zeroes
 */
export const formatSpanId = (id: string) => {
  return ('000000000000000' + id).substr(-16);
};
