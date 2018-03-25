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

import * as cls from '../internal/cls'
import { RootSpan } from './model/rootspan'
import { Span } from './model/span'
import { PluginLoader } from './plugins/pluginloader'
import { debug } from '../internal/util'
import { Stackdriver } from '../exporters/stackdriver/stackdriver'
import { StackdriverOptions } from '../exporters/stackdriver/options'
import { Zipkin } from '../exporters/zipkin/zipkin'
import { ZipkinOptions } from '../exporters/zipkin/options'
import { Tracer } from './model/tracer'
import { Exporter } from '../exporters/exporter'
import { ExporterOptions } from '../exporters/exporterOptions';

export type Func<T> = (...args: any[]) => T;

export class Tracing {

    private _active: Boolean;
    private _tracer: Tracer;
    private _exporter: Exporter;
    private pluginLoader: PluginLoader;

    readonly PLUGINS = ['http', 'https', 'mongodb-core', 'express']

    constructor() {
        this._tracer = new Tracer();
        this.pluginLoader = new PluginLoader(this._tracer);
    }

    public start(): Tracing {
        this.pluginLoader.loadPlugins(this.PLUGINS);
        this._active = true;
        this._tracer.start();
        return this;
    }

    public stop() {
        this._active = false;
        this._tracer.stop();
    }
    
    public get Tracer() : Tracer {
        return this._tracer;
    }

    public get Exporter(): Exporter {
        return this._exporter;
    }

    public startStackdriver(projectId: string): Tracing {
        let stackdriverOptions = new StackdriverOptions(projectId);
        this._exporter = new Stackdriver(stackdriverOptions);
        this._tracer.registerExporter(this._exporter);
        return this.start();
    }

    public startZipkin(url: string, serviceName: string): Tracing {
        let zipkinOptions = new ZipkinOptions(url, serviceName);
        this._exporter = new Zipkin(zipkinOptions);
        this._tracer.registerExporter(this._exporter);
        return this.start();
    }

}

