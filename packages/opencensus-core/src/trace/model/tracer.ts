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

import * as cls from '../../internal/cls';
import { RootSpanImpl } from './rootspan';
import { SpanImpl } from './span';
import { debug } from '../../internal/util';
import { Sampler } from '../config/sampler';
import { TraceOptions, TracerConfig, defaultConfig, Tracer, OnEndSpanEventListener, Func } from '../types';

//ßexport type Func<T> = (...args: any[]) => T;

export class TracerImpl implements Tracer {

    readonly PLUGINS = ['http', 'https', 'mongodb-core'];

    //public buffer: Buffer;
    private activeLocal: boolean;
    private contextManager: cls.Namespace;
    private config: TracerConfig;

    //TODO: simple solution - to be rewied in future
    private eventListenersLocal: OnEndSpanEventListener[] = [];
    //TODO: temp solution 
    private endedTraces: RootSpanImpl[] = [];

    constructor() {
        this.activeLocal = false;
        this.contextManager = cls.createNamespace();
    }

    get currentRootSpan(): RootSpanImpl {
        return this.contextManager.get('rootspan');
    }

    set currentRootSpan(root: RootSpanImpl) {
        this.contextManager.set('rootspan', root);
    }

    start(config?: TracerConfig): Tracer {
        this.activeLocal = true;
        this.config = config || defaultConfig;
        return this;
    }

    get eventListeners(): OnEndSpanEventListener[] {
        return this.eventListenersLocal;
    }

    stop() {
        this.activeLocal = false;
    }

    get active(): boolean {
        return this.activeLocal;
    }

    startRootSpan<T>(options: TraceOptions, fn: (root: RootSpanImpl) => T): T {
        return this.contextManager.runAndReturn((root) => {
            const newRoot = new RootSpanImpl(this, options);
            this.currentRootSpan = newRoot;
            if (!options) {
                options = {} as TraceOptions;
            }
            if (!options.sampler) {
                options.sampler = new Sampler(newRoot.traceId);
                //options.sampler.probability(0.5);
                options.sampler.always();
            }
            newRoot.sampler = options.sampler;
            if (newRoot.sampler.shouldSample(newRoot.traceId)) {
                newRoot.start();
                return fn(newRoot);
            }
            return fn(null);
        });
    }

    onEndSpan(root: RootSpanImpl): void {
        if (!root) {
            return debug('cannot end trace - no active trace found');
        }
        if (this.currentRootSpan !== root) {
            debug('currentRootSpan != root on notifyEnd. Need more investigation.');
        }
        this.notifyEndSpan(root);
        //this.clearCurrentTrace();
    }

    registerEndSpanListener(listner: OnEndSpanEventListener) {
        this.eventListenersLocal.push(listner);
    }

    private notifyEndSpan(root: RootSpanImpl) {
        if (this.active) {
            debug('starting to notify listeners the end of rootspans');
            if (this.eventListenersLocal && this.eventListenersLocal.length > 0) {
                this.eventListenersLocal.forEach((listener) => listener.onEndSpan(root));
            }
        } else {
            debug('this tracer is inactivate cant notify endspan');
        }
    }

    clearCurrentTrace() {
        this.currentRootSpan = null;
    }

    startSpan(name?: string, type?: string, parentSpanId?: string): SpanImpl {
        let newSpan: SpanImpl = null;
        if (!this.currentRootSpan) {
            debug('no current trace found - must start a new root span first');
        } else {
            newSpan = this.currentRootSpan.startSpan(name, type, parentSpanId);
        }
        return newSpan;
    }

    wrap<T>(fn: Func<T>): Func<T> {
        if (!this.active) {
            return fn;
        }

        // This is safe because isActive checks the value of this.namespace.
        const namespace = this.contextManager as cls.Namespace;
        return namespace.bind<T>(fn);
    }

    wrapEmitter(emitter: NodeJS.EventEmitter): void {
        if (!this.active) {
            return;
        }

        // This is safe because isActive checks the value of this.namespace.
        const namespace = this.contextManager as cls.Namespace;
        namespace.bindEmitter(emitter);
    }
}



