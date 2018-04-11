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

export class Clock {
  private endedLocal: boolean;
  private startTimeLocal: Date;
  private hrtimeLocal: [number, number];
  private diff: [number, number];

  constructor() {
    this.endedLocal = false;
    this.startTimeLocal = new Date();
    this.hrtimeLocal = process.hrtime();
    this.diff = null;
  }

  end(): void {
    if (this.endedLocal) {
      return;
    }
    this.diff = process.hrtime(this.hrtimeLocal);
    this.endedLocal = true;
  }

  get duration(): number {
    if (!this.endedLocal) {
      return null;
    }
    const ns = this.diff[0] * 1e9 + this.diff[1];
    return ns / 1e6;
  }

  offset(timer: Clock): number {
    const a = timer.hrtime;
    const b = this.hrtime;
    const ns = (b[0] - a[0]) * 1e9 + (b[1] - a[1]);
    return ns / 1e6;
  }

  get hrtime(): [number, number] {
    return this.hrtimeLocal;
  }

  get startTime(): Date {
    return this.startTimeLocal;
  }

  get endTime(): Date {
    let result: Date = null;
    if (this.ended) {
      result = new Date(this.startTime.getTime() + this.duration);
    }
    return result;
  }

  get ended(): boolean {
    return this.endedLocal;
  }
}
