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

import {classes} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';

const log = logger.logger();

import * as assert from 'assert';
import {isArray} from 'util';

import {Constants} from '../src/trace/constants';
import {PluginLoader} from '../src/trace/instrumentation/plugingloader';
import {Tracing} from '../src/trace/tracing';

describe('PluginLoader', () => {
  /** Should create a Tracing instance */
  describe('new PluginLoader()', () => {
    it('should create a PluginLoader instance', () => {
      const tracer = new classes.Tracer();
      const pluginLoader = new PluginLoader(log, tracer);
      assert.ok(pluginLoader instanceof PluginLoader);
    });
  });

  /** Should get the plugins to use. */
  describe('static defaultPluginsFromArray()', () => {
    it('should get the plugins to use', () => {
      const plugins = PluginLoader.defaultPluginsFromArray(
          Constants.DEFAULT_INSTRUMENTATION_MODULES);
      assert.ok(plugins['http']);
      assert.ok(plugins['https']);
      assert.ok(plugins['mongodb-core']);
    });
  });

  /** Should load the plugins. */
  describe('loadPlugins()', () => {
    it('should load the plugins', () => {
      const plugins = PluginLoader.defaultPluginsFromArray(
          Constants.DEFAULT_INSTRUMENTATION_MODULES);
      const tracer = new classes.Tracer();
      const pluginLoader = new PluginLoader(log, tracer);

      assert.equal(pluginLoader.loadPlugins(plugins), null);
    });
  });

  /** Should unload the plugins. */
  describe('unloadPlugins()', () => {
    it('should unload the plugins', () => {
      const plugins = PluginLoader.defaultPluginsFromArray(
          Constants.DEFAULT_INSTRUMENTATION_MODULES);
      const tracer = new classes.Tracer();
      const pluginLoader = new PluginLoader(log, tracer);
      pluginLoader.loadPlugins(plugins);

      assert.equal(pluginLoader.unloadPlugins(), null);
    });
  });
});