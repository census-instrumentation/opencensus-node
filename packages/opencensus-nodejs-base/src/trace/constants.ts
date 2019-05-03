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

/** General purpose constants. */
const constants = {
  /** Default maximum size of a buffer. */
  DEFAULT_BUFFER_SIZE: 100,
  /** Default max timeout for a buffer before being flushed */
  DEFAULT_BUFFER_TIMEOUT: 20000,
  /** OpenCensus Scope */
  OPENCENSUS_SCOPE: '@opencensus',
  /** Default prefix for instrumentation modules */
  DEFAULT_PLUGIN_PACKAGE_NAME_PREFIX: 'instrumentation',
  /** Default Limit for Trace Parameters */
  DEFAULT_TRACE_PARAMS: {
    numberOfAnnontationEventsPerSpan: 32,
    numberOfAttributesPerSpan: 32,
    numberOfLinksPerSpan: 32,
    numberOfMessageEventsPerSpan: 128
  }
};

export {constants as Constants};
