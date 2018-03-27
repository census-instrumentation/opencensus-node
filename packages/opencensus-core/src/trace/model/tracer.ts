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

import * as cls from '../../internal/cls'
import { RootSpan } from './rootspan'
import { Span } from './span'
import { debug } from '../../internal/util'
import { Stackdriver } from '../../exporters/stackdriver/stackdriver'
import { StackdriverOptions } from '../../exporters/stackdriver/options'
import { Exporter } from '../../exporters/exporter'
import { TraceContext, OnEndSpanEventListener } from '../types/tracetypes';
import { TracerConfig, defaultConfig } from '../tracing';
import { Buffer } from '../../exporters/buffer'

export type Func<T> = (...args: any[]) => T;


export class Tracer implements OnEndSpanEventListener {

    readonly PLUGINS = ['http', 'https', 'mongodb-core', 'express'];

    //public buffer: Buffer;
    private _active: boolean;
    private contextManager: cls.Namespace;
    private config: TracerConfig;

    //TODO: simple solution - to be rewied in future
    private eventListeners: OnEndSpanEventListener[] = [];
    //TODO: temp solution 
    private endedTraces: RootSpan[] = [];

    constructor() {
        this._active = false;
        this.contextManager = cls.createNamespace();
    }

    public get currentRootSpan(): RootSpan {
        return this.contextManager.get('rootspan');
    }

    private setCurrentRootSpan(root: RootSpan) {
        this.contextManager.set('rootspan', root);
    }

    public start(config?: TracerConfig): Tracer {
        this._active = true;
        this.config = config || defaultConfig;
        return this;
    }

    public getEventListeners(): OnEndSpanEventListener[] {
        return this.eventListeners;
    }

    public stop() {
        this._active = false;
    }

    public get active(): boolean {
        return this._active;
    }

    public startRootSpan(context?: TraceContext): RootSpan {
        let newTrace = new RootSpan(this, context);
        this.setCurrentRootSpan(newTrace);
        newTrace.start();
        return newTrace;
    }


    public onEndSpan(root: RootSpan): void {
        if (!this.currentRootSpan) {
            return debug('cannot end trace - no active trace found')
        }
        if (this.currentRootSpan != root) {
            return debug('currentRootSpan != root on notifyEnd. Possbile implementation bug.')
        }
        this.notifyEndSpan(this.currentRootSpan);
        //this.clearCurrentTrace();
    }

    //TODO: review
    public runInContex<T>(fn: Func<T>): T {
        return this.contextManager.runAndReturn(fn)
    }

    public registerEndSpanListener(listener: OnEndSpanEventListener) {
        this.eventListeners.push(listener);
        //this.buffer.registerExporter(exporter)
    }
    
    /*public registerExporter(exporter: Exporter) {
        //this.eventListeners.push(listner);
        this.buffer.registerExporter(exporter)
    }*/

    private notifyEndSpan(root: RootSpan) {
        if (this.active) {
            //this.buffer.onEndSpan(root);
            if (this.eventListeners && this.eventListeners.length > 0) {
                this.eventListeners.forEach((listener) => listener.onEndSpan(root))
            }
        } else {
            debug('this tracer is inactivate cant notify endspan')
        }
    }

    public clearCurrentTrace() {
        this.setCurrentRootSpan(null);
    }

    public startSpan(name: string, type: string): Span {
        let newSpan: Span = null;
        if (!this.currentRootSpan) {
            debug('no current trace found - cannot start a new span');
        } else {
            newSpan = this.currentRootSpan.startSpan(name, type);
        }
        return newSpan;
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



