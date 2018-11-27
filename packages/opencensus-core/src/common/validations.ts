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

/**
 * Ensures that an object reference passed as a parameter to the calling
 * method is not null.
 *
 * @param {T} reference An object reference.
 * @param {string} errorMessage The exception message to use if the check fails.
 * @returns {T} An object reference.
 */
export function checkNotNull<T>(reference: T, errorMessage: string): T {
  if (!reference) {
    throw new Error(`Missing mandatory ${errorMessage} parameter`);
  }
  return reference;
}

/**
 * Ensures the truth of an expression involving one or more parameters to the
 * calling method.
 *
 * @param  {boolean} expression A boolean expression.
 * @param  {string} errorMessage The exception message to use if the check fails.
 */
export function checkArgument(expression: boolean, errorMessage: string) {
  if (!expression) {
    throw new Error(`Invalid arguments: ${errorMessage}`);
  }
}

/**
 * Throws an Error if any of the list elements is null.
 *
 * @param {T} list The argument list to check for null.
 * @param {string} errorMessage The exception message to use if the check fails.
 */
export function checkListElementNotNull<T>(list: T[], errorMessage: string) {
  for (const element of list) {
    if (!element) {
      throw new Error(`${errorMessage} elements should not be a NULL`);
    }
  }
}
