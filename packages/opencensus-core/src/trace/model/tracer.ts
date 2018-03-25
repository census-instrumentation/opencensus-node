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
import { Exporter, NoopExporter } from '../../exporters/exporter'
import { TraceContext } from '../types/tracetypes';

export type Func<T> = (...args: any[]) => T;

export interface TracerConfig {
        exporter?: Exporter,
        sampleRate?: number;
        ignoreUrls?:  Array<string|RegExp>;
}

export const defaultConfig: TracerConfig = {
   exporter: new NoopExporter(),
   sampleRate: 1.0
}

export class Tracer {

    readonly PLUGINS = ['http', 'https', 'mongodb-core', 'express'];

    private _active: boolean;
    private contextManager: cls.Namespace;
    private exporter: Exporter;
    private config: TracerConfig;

    //TODO: temp solution 
    private endedTraces: RootSpan[] = [];

    constructor() {
        this._active = false;
        this.contextManager = cls.createNamespace();
    }

    public get currentTrace(): RootSpan {
        return this.contextManager.get('trace');
    }

    private setCurrentTrace(trace: RootSpan) {
        this.contextManager.set('trace', trace);
    }

    public start(config?: TracerConfig): Tracer {
        this._active = true;
        this.config = config || defaultConfig;
        this.exporter = this.config.exporter;
        return this;
    }

    public stop() {
        this._active = false;
    }

    public get active(): boolean {
        return this._active;
    }

    public startRootSpan(context?: TraceContext): RootSpan {
        let newTrace = new RootSpan(context);
        this.setCurrentTrace(newTrace);
        newTrace.start();
        return newTrace;
    }

    //TODO: review
    public runInContex<T>(fn: Func<T>): T {
        return this.contextManager.runAndReturn (fn)
    }

    public endRootSpan(): void {
        if (!this.currentTrace) {
            return debug('cannot end trace - no active trace found')
        }
        this.currentTrace.end();
        this.addEndedTrace(this.currentTrace);
        //this.clearCurrentTrace();
    }

    public clearCurrentTrace() {
        this.setCurrentTrace(null);
    }

    public startSpan(name: string, type: string): Span {
        let newSpan: Span = null;
        if (!this.currentTrace) {
            debug('no current trace found - cannot start a new span');
        } else {
            newSpan = this.currentTrace.startSpan(name, type);
        }
        return newSpan;
    }

    /*public endSpan(span: Span) {
        debug('END SPAN', span);
        span.end();
        this.exporter.emit(this.currentTrace);
    }*/

    private addEndedTrace(trace: RootSpan) {
        if (this.active) {
            //TODO: temp solution
            //this.endedTraces.push(trace);
            this.exporter.writeTrace(this.currentTrace);
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

    public registerExporter(exporter: Exporter) {
        this.exporter = exporter;
    }

}



