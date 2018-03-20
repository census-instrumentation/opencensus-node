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

import {Clock} from '../../internal/clock';
import {debug, randomSpanId} from '../../internal/util'

  
export interface MapLabels { [propName: string]: string; }
export interface MapObjects { [propName: string]: any; }

export abstract class TracerComponent {

    private _className: string;
    private _id: string;
    private clock: Clock;
    //------
    private _remoteParent: string;
    private attributes: MapLabels = {};
    private annotations: MapObjects  = {};
    //messageEvents
    //links
    private _name: string;
    private _started: boolean;
    private _ended: boolean;
    private _type: string;
    private _status: number;
    //TODO truncated 
    private _truncated: boolean; 

   constructor() {
      this._className = this.constructor.name;
      this._name = null;
      this._type = null;
      this._started = false;
      this.clock = null;
      this._truncated = false;
      this._ended = false;
    }

    public get id() : string {
        return this._id;
    }
 
    protected setId(id : string) {
        this._id = id;
    }
    
    public get name() {
        return this._name;
    }

    public get started(): boolean {
        return this._started;
    }    

    public get ended(): boolean {
        return this._ended;
    }

    public set name(name: string) {
        this._name = name;
    }

    public get type() : string {
        return this._type;
    }
    
    public set type(type : string) {
        this._type = type;
    }
        
    public set remoteParente(remoteParent : string) {
        this._remoteParent = remoteParent;
    }

    public get remoteSpanId() : string {
        return this._remoteParent;
    }
    
    public get status(): number {
        return this._status;
    }

    public set status(status: number) {
        this._status = status;
    }
  
    public get startTime(): Date {
        return this.clock.startTime;
    }
    
    public get endTime(): Date {
        return this.clock.endTime;
    }

    public get duration() : number {
        return this.clock.duration;
    }   

    //TODO: maybe key and values must be truncate
    public addAtribute(key: string, value: string) {
        this.attributes[key] = value;
    }

    //TODO: maybe keys and values must be truncate
    public addAnotation(key: string, value: {}) {
        this.annotations[key] = value;
    }   
    
    public start() {
        if (this.started) {
            debug('calling %s.start() on already started %s %o',
                this._className, this._className,
                 {id: this.id, name: this.name, type: this.type})
            return
        }        
        this.clock = new Clock();
        this._started = true;   
    }

    public end(): void {
        if (!this.started) {
            debug('calling %s.end() on un-started %s %o', 
                this._className, this._className,
                {id: this.id,  name: this.name, type: this.type})
            return
        } else if (this.ended) {
            debug('calling %s.end() on already ended %s %o', 
                this._className, this._className,
                {id:this.id ,  name: this.name, type: this.type})
            return
        }   
        this._started = false;
        this._ended = true;
        this.clock.end();
       
    }


    //TODO: review
    public truncate() {
        if (!this.started) {
            debug('calling truncate non-started %s - ignoring %o', this._className, {id: this.id, name: this.name, type: this.type})
            return
          } else if (this.ended) {
            debug('calling truncate already ended %s - ignoring %o',this._className, {id: this.id, name: this.name, type: this.type})
            return
        }
        this._truncated = true
        this.end()
        debug('truncating %s  %o', this._className, {id: this.id, name: this.name })
      }
      
}
