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

import {Tracer} from './model/types';
import {Sampler} from './config/types';
import {Exporter} from '../exporters/types';
import {Config} from './config/types';

//TODO: Improve JSDoc

/**
 *  Main interface for tracing. Holds instances for {@link Tracer} and
 *  {@link Exporter}.
 *
 */
export interface Tracing {
  
  /**
   * Returns the {@link Tracer} object responsible for managing a trace.
   * @return the {@link Tracer} implementation.
   */
  readonly tracer: Tracer;

  /**
   * Returns the {@link Exportert} 
   * @return the {@link ExportComponent} implementation.
   */
  readonly exporter: Exporter;

  /**
   * Enable tracing process.
   * @param userConfig Configuration provided by a client
   */
  start(userConfig?:Config): Tracing;

  /**
   * Stop tracing.
   * 
   */
  stop(): void;

  /**
   * Registers an exporter to send the collected traces to.
   * @param exporter The exporter to send the traces to.
   */
  registerExporter(exporter: Exporter): Tracing;
}

