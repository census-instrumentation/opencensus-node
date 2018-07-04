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

import {Measure, MeasureUnit, RegisteredMeasures} from './types';


/** Measure class for double type */
abstract class AbstractMeasure implements Measure {
  readonly name: string;
  readonly description: string;
  readonly unit: MeasureUnit;
  abstract get type(): string;

  constructor(name: string, description: string, unit: MeasureUnit) {
    this.name = name;
    this.description = description;
    this.unit = unit;
  }
}

/** Measure class for double type */
class MeasureDouble extends AbstractMeasure {
  readonly type: string;
  constructor(name: string, description: string, unit: MeasureUnit) {
    super(name, description, unit);
    this.type = 'DOUBLE';
  }
}

/** Measure class for int64 type */
class MeasureInt64 extends AbstractMeasure {
  readonly type: string;
  constructor(name: string, description: string, unit: MeasureUnit) {
    super(name, description, unit);
    this.type = 'INT64';
  }
}

/**
 * Simple Mesure Builder and Register
 */
export class MeasureManager {
  private static registeredMeasures: RegisteredMeasures = {};

  private static registerMeasure(measure: Measure) {
    const existingMeasure = MeasureManager.registeredMeasures[measure.name];
    if (existingMeasure) {
      return;
    }
    MeasureManager.registeredMeasures[measure.name] = measure;
  }

  /** Factory method that createas a Measure of type DOUBLE */
  static createMeasureDouble(
      name: string, description: string, unit: MeasureUnit): Measure {
    const newMesure = new MeasureDouble(name, description, unit);
    MeasureManager.registerMeasure(newMesure);
    return newMesure;
  }

  /** Factory method that createas a Measure of type INT64 */
  static createMeasureInt64(
      name: string, description: string, unit: MeasureUnit): Measure {
    const newMesure = new MeasureInt64(name, description, unit);
    MeasureManager.registerMeasure(newMesure);
    return newMesure;
  }
}
