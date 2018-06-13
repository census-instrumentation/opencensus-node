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

import {Measure} from './types';

/** Measure class for double type */
export class MeasureDouble implements Measure {
  name: string;
  description: string;
  unit: string;
  type: string;

  constructor(name: string, description: string, unit: string) {
    this.name = name;
    this.description = description;
    this.unit = unit;
    this.type = 'DOUBLE';
  }
}

/** Measure class for int64 type */
export class MeasureInt64 implements Measure {
  name: string;
  description: string;
  unit: string;
  type: string;

  constructor(name: string, description: string, unit: string) {
    this.name = name;
    this.description = description;
    this.unit = unit;
    this.type = 'INT64';
  }
}
