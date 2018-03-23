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
    private _ended: boolean;
    private _startTime: Date;
    private _hrtime: [number, number];
    private diff: [number,number];

    constructor() {
        this._ended = false
        this._startTime = new Date()
        this._hrtime = process.hrtime()
        this.diff = null
    }

    public end(): void {
        if (this._ended){
            return
        }
        this.diff = process.hrtime(this._hrtime)
        this._ended = true
      }
      
    public get duration(): number {
        if (!this._ended){
             return null
        }
        var ns = this.diff[0] * 1e9 + this.diff[1]
        return ns / 1e6
      }
      
     public  offset(timer: Clock): number {
        var a = timer.hrtime
        var b = this.hrtime
        var ns = (b[0] - a[0]) * 1e9 + (b[1] - a[1])
        return ns / 1e6
    }

    public get hrtime() : [number, number] {
          return this._hrtime;
    }
      
    public get startTime(): Date {
          return this._startTime;
    }
 
    public get endTime(): Date {
        let result: Date = null;
        if(this.ended) {
            result= new Date(this.startTime.getTime() + this.duration);
        } 
        return result;
    }     

    public get ended(): boolean {
         return this._ended;
     }

}








