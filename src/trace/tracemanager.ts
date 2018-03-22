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

import * as cls from '../internal/cls';
import {Trace} from './trace'
import {Span} from './span' 
import {PluginLoader} from './plugins/pluginloader'
import {debug} from '../internal/util'
import {Stackdriver} from '../exporters/stackdriver'

export type Func<T> = (...args: any[]) => T;

export class TraceManager {

    readonly PLUGINS = ['http', 'https', 'mongodb-core', 'express']
    
    private _active: boolean;
    private contextManager: cls.Namespace;
    private pluginLoader: PluginLoader;
    private exporter

    //TODO: temp solution 
    private endedTraces: Trace[] = [];

    constructor() {
        this._active = false;
        this.contextManager = cls.createNamespace();
        this.pluginLoader = new PluginLoader(this);
        this.exporter = new Stackdriver('opencensus-cesar');
    }

    public get currentTrace(): Trace  {
       return this.contextManager.get('trace');
    }

    private setCurrentTrace(trace:Trace) {
         this.contextManager.set('trace', trace);
    }

    public start(config?:Object): TraceManager {
        this.pluginLoader.loadPlugins(this.PLUGINS);
        this._active = true;
        return this;
    }

    public get active(): boolean {
        return this._active;
    }

    public startTrace(): Trace {
        let newTrace = new Trace();
        this.setCurrentTrace(newTrace);
        newTrace.start();
        return newTrace;
    }

    public endTrace(): void {
        if (!this.currentTrace) return debug('cannot end trace - no active trace found')
        this.currentTrace.end();
        this.exporter.emit(this.currentTrace);
        this.addEndedTrace(this.currentTrace);
        //this.clearCurrentTrace();
        this.startTrace();
    }
    
    public clearCurrentTrace() {
        this.setCurrentTrace(null);
    }

    public startSpan(name:string, type: string): Span {
        let newSpan: Span = null;
        if (!this.currentTrace) { 
            debug('no current trace found - cannot start a new span'); 
        } else {
            newSpan = this.currentTrace.startSpan(name, type)
        }
        return newSpan;
    }

    /*public endSpan(span: Span) {
        debug('END SPAN', span);
        span.end();
        this.exporter.emit(this.currentTrace);
    }*/

    
    private addEndedTrace(trace: Trace) {
        if (this.active) {
            //TODO: temp solution
            this.endedTraces.push(trace);
        }
    }

    public wrap<T>(fn: Func<T>): Func<T> {
        if (!this.active) {
           return fn;
         }
    
        // This is safe because isActive checks the value of this.namespace.
        const namespace = this.contextManager as cls.Namespace;
        return namespace.bind<T>(fn);
    }
    
    public wrapEmitter(emitter: NodeJS.EventEmitter): void {
         if (!this.active) {
           return;
         }

        // This is safe because isActive checks the value of this.namespace.
        const namespace = this.contextManager as cls.Namespace;
        namespace.bindEmitter(emitter);
    }

}  



