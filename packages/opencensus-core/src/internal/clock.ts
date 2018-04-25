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

/** Defines a Clock. */
export class Clock {
  /** Indicates if the clock is endend. */
  private endedLocal = false;
  /** Indicates the clock's start time. */
  private startTimeLocal: Date;
  /** The time in high resolution in a [seconds, nanoseconds]. */
  private hrtimeLocal: [number, number];
  /** The duration between start and end of the clock. */
  private diff: [number, number] = null;

  /** Constructs a new SamplerImpl instance. */
  constructor() {
    this.startTimeLocal = new Date();
    this.hrtimeLocal = process.hrtime();
  }

  /** Ends the clock. */
  end(): void {
    if (this.endedLocal) {
      return;
    }
    this.diff = process.hrtime(this.hrtimeLocal);
    this.endedLocal = true;
  }

  /** Gets the duration of the clock. */
  get duration(): number {
    if (!this.endedLocal) {
      return null;
    }
    const ns = this.diff[0] * 1e9 + this.diff[1];
    return ns / 1e6;
  }


  /** Starts the clock. */
  get startTime(): Date {
    return this.startTimeLocal;
  }

  /**
   * Gets the time so far.
   * @returns A Date object with the current duration.
   */
  get endTime(): Date {
    let result: Date = null;
    if (this.ended) {
      result = new Date(this.startTime.getTime() + this.duration);
    }
    return result;
  }

  /** Indicates if the clock was ended. */
  get ended(): boolean {
    return this.endedLocal;
  }
}
