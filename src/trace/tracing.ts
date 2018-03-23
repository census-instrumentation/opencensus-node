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
import {Trace} from './model/trace'
import {Span} from './model/span' 
import {PluginLoader} from './plugins/pluginloader'
import {debug} from '../internal/util'
import {Stackdriver} from '../exporters/stackdriver/stackdriver'
import {StackdriverOptions} from '../exporters/stackdriver/options'
import { Tracer } from './model/tracer';
import { Exporter } from '../exporters/exporter';

export type Func<T> = (...args: any[]) => T;

export class Tracing {

    private _active: Boolean;
    private _tracer: Tracer;  
    private _exporter: Exporter;     
    private pluginLoader: PluginLoader;

    readonly PLUGINS = ['http', 'https', 'mongodb-core', 'express']
    
    constructor() {
        this.pluginLoader = new PluginLoader(this._tracer);
        this._exporter = new Stackdriver(new StackdriverOptions('opencensus-cesar'));
        this._tracer = new Tracer(this._exporter);
    }

    public start(config?:Object): Tracing {
        this.pluginLoader.loadPlugins(this.PLUGINS);
        this._active = true;
        this._tracer.start();
        return this;
    }

    public get Tracer() : Tracer {
        return this._tracer;
    }

    public get Exporter() : Exporter {
        return this._exporter;
    }
        
}

