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

import {Constants} from '../constants';

/**
 * Defines a default configuration. For fields with primitive values,
 * or non-primitive but non-map value (logger, exporter), any user-provided
 * value will override the corresponding default value. For fields with
 * non-primitive values, but map value (plugins), the user-provided value
 * will be used to extend/overwrite the default value.
 */
export const defaultConfig = {
  logLevel: 1,
  maximumLabelValueSize: 150,
  plugins: {},
  bufferSize: Constants.DEFAULT_BUFFER_SIZE,
  bufferTimeout: Constants.DEFAULT_BUFFER_TIMEOUT,
  samplingRate: 1
};
