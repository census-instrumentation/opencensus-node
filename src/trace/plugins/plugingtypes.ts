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

export interface Plugin <T> {
    applyPatch(module: any, tracer: T, version: string): void; 
}

export abstract class BasePlugin <T>  {

    public module: any;
    public moduleName: string;
    public tracer: T;
    public version: string;

    constructor (moduleName: string) {
        this.moduleName = moduleName;
    }

    setPluginContext(http: any, tracer: T, version: string) {
        this.module = http;
        this.tracer = tracer;
        this.version = version;     
    }

}