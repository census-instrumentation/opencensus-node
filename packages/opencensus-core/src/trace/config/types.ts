/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

 import {Exporter} from '../../exporters/types';
import {PluginNames} from '../instrumentation/types';
import {Logger} from '../../common/types';

/** Interface configuration for a buffer. */
export interface BufferConfig {
  bufferSize?: number;
  bufferTimeout?: number;
  logger?: Logger;
}

/** Defines tracer configuration parameters */
export interface TracerConfig {
  /** Determines the samplin rate. Ranges from 0.0 to 1.0 */
  samplingRate?: number;
  /** Determines the ignored (or blacklisted) URLs */
  ignoreUrls?: Array<string|RegExp>;
  /** A logger object to show infos */
  logger?: Logger;
}

/** Available configuration options. */
export interface TracingConfig {
  logLevel?: number;
  maximumLabelValueSize?: number;
  plugins?: PluginNames;
  exporter?: Exporter;
  logger?: Logger;
}

export type Config = TracingConfig&TracerConfig&BufferConfig;


