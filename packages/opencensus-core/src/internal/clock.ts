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
 * The Clock class is used to record the duration and endTime for spans.
 */
export class Clock {
  /** Indicates if the clock is endend. */
  private endedLocal = false;
  /** Indicates the clock's start time. */
  private startTimeLocal: Date;
  /** The time in high resolution in a [seconds, nanoseconds]. */
  private hrtimeLocal: [number, number];
  /** The duration between start and end of the clock. */
  private diff: [number, number] = [0, 0];

  /** Constructs a new Clock instance. */
  constructor(startTime?: Date) {
    // In some cases clocks need to be relative to other resources, passing a
    // startTime makes it possible.
    this.startTimeLocal = startTime || new Date();
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

  /** Gets the current date from ellapsed milliseconds and start time. */
  get currentDate(): Date {
    const diff = process.hrtime(this.hrtimeLocal);
    const ns = diff[0] * 1e9 + diff[1];
    const ellapsed = ns / 1e6;
    return new Date(this.startTime.getTime() + ellapsed);
  }

  /** Gets the duration of the clock. */
  get duration(): number {
    if (!this.endedLocal) {
      return 0;
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
    if (this.ended) {
      return new Date(this.startTime.getTime() + this.duration);
    }
    return new Date();
  }

  /** Indicates if the clock was ended. */
  get ended(): boolean {
    return this.endedLocal;
  }
}
