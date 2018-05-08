/**
 * Copyright 2018, OpenCensus Authors
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

import {classes, types} from '@opencensus/opencensus-core';
import {logger} from '@opencensus/opencensus-core';

import * as assert from 'assert';
import {isArray} from 'util';

import {Constants} from '../src/trace/constants';
import {PluginLoader} from '../src/trace/instrumentation/plugin-loader';
import {Tracing} from '../src/trace/tracing';


const INSTALED_PLUGINS_PATH = `${__dirname}/instrumentation/node_modules`;
const TEST_MODULES = ['simple-module'];

const clearRequireCache = () => {
  Object.keys(require.cache).forEach(key => delete require.cache[key]);
};

describe('Trace Plugin Loader', () => {
  const log = logger.logger();

  before(() => {
    module.paths.push(INSTALED_PLUGINS_PATH);
    PluginLoader.searchPathForTest = INSTALED_PLUGINS_PATH;
  });

  afterEach(() => {
    clearRequireCache();
  });


  describe('PluginLoader', () => {
    const plugins = PluginLoader.defaultPluginsFromArray(TEST_MODULES);
    const tracer = new classes.Tracer();


    /** Should create a PluginLoader instance */
    describe('new PluginLoader()', () => {
      it('should create a PluginLoader instance', () => {
        const pluginLoader = new PluginLoader(log, tracer);
        assert.ok(pluginLoader instanceof PluginLoader);
      });
    });

    /** Should get the plugins to use. */
    describe('static defaultPluginsFromArray()', () => {
      it('should get the default plugins from a module name array', () => {
        const plugins = PluginLoader.defaultPluginsFromArray(TEST_MODULES);
        assert.ok(plugins[TEST_MODULES[0]]);
        assert.strictEqual(
            plugins[TEST_MODULES[0]],
            '@opencensus/opencensus-instrumentation-simple-module');
      });
    });

    /** Should load the plugins. */
    describe('loadPlugins()', () => {
      it('sanity check', () => {
        const simpleModule = require(TEST_MODULES[0]);
        assert.strictEqual(simpleModule.name(), TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 100);
      });

      it('should load the plugins and patch the target modules', () => {
        const pluginLoader = new PluginLoader(log, tracer);
        assert.equal(pluginLoader.plugins.length, 0);
        pluginLoader.loadPlugins(plugins);
        const simpleModule = require(TEST_MODULES[0]);
        assert.equal(pluginLoader.plugins.length, 1);
        assert.strictEqual(simpleModule.name(), 'patched-' + TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 101);
      });
    });

    /** Should unload the plugins. */
    describe('unloadPlugins()', () => {
      it('should unload the plugins and unpatch the target module', () => {
        const pluginLoader = new PluginLoader(log, tracer);
        assert.equal(pluginLoader.plugins.length, 0);
        pluginLoader.loadPlugins(plugins);
        const simpleModule = require(TEST_MODULES[0]);
        assert.equal(pluginLoader.plugins.length, 1);
        assert.strictEqual(simpleModule.name(), 'patched-' + TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 101);
        pluginLoader.unloadPlugins();
        assert.equal(pluginLoader.plugins.length, 0);
        assert.strictEqual(simpleModule.name(), TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 100);
      });
    });

    /** Should load/unload end-user (non-default named) plugin. */
    describe('load/unload end-user pluging', () => {
      it('should load/unload patch/unpatch end-user plugins', () => {
        const pluginLoader = new PluginLoader(log, tracer);
        assert.equal(pluginLoader.plugins.length, 0);

        const endUserPlugins = {
          'simple-module': 'enduser-simple-module-pluging'
        };
        pluginLoader.loadPlugins(endUserPlugins);
        const simpleModule = require(TEST_MODULES[0]);
        assert.equal(pluginLoader.plugins.length, 1);
        assert.strictEqual(
            simpleModule.name(), 'my-patched-' + TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 102);
        pluginLoader.unloadPlugins();
        assert.equal(pluginLoader.plugins.length, 0);
        assert.strictEqual(simpleModule.name(), TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 100);
      });
    });
  });
});
