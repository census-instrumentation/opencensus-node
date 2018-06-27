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

import {CoreTracer, logger} from '@opencensus/core';
import * as assert from 'assert';
import * as path from 'path';

import {Constants} from '../src/trace/constants';
import {PluginLoader} from '../src/trace/instrumentation/plugin-loader';


const INSTALLED_PLUGINS_PATH = `${__dirname}/instrumentation/node_modules`;
const TEST_MODULES = [
  'simple-module'  // this module exist and has a plugin
  ,
  'nonexistent-module'  // this module does not exist
  ,
  'http'  // this module does not have a plugin
  ,
  'load-internal-file-module'  // this module has an internal file not exported
];


const clearRequireCache = () => {
  Object.keys(require.cache).forEach(key => delete require.cache[key]);
};

describe('Plugin Loader', () => {
  const log = logger.logger(4);

  before(() => {
    module.paths.push(INSTALLED_PLUGINS_PATH);
    PluginLoader.searchPathForTest = INSTALLED_PLUGINS_PATH;
  });

  afterEach(() => {
    clearRequireCache();
  });


  describe('PluginLoader', () => {
    const plugins = PluginLoader.defaultPluginsFromArray(TEST_MODULES);
    const tracer = new CoreTracer();
    tracer.start({logger: log});

    /** Should get the plugins to use. */
    describe('static defaultPluginsFromArray()', () => {
      it('should get the default plugins from a module name array', () => {
        const plugins = PluginLoader.defaultPluginsFromArray(TEST_MODULES);
        assert.ok(plugins[TEST_MODULES[0]]);
        assert.ok(plugins[TEST_MODULES[1]]);
        assert.ok(plugins[TEST_MODULES[2]]);
        assert.ok(plugins[TEST_MODULES[3]]);
        assert.strictEqual(
            plugins[TEST_MODULES[0]],
            `@opencensus/${
                Constants.DEFAULT_PLUGIN_PACKAGE_NAME_PREFIX}-simple-module`);
        assert.strictEqual(
            plugins[TEST_MODULES[1]],
            `@opencensus/${
                Constants
                    .DEFAULT_PLUGIN_PACKAGE_NAME_PREFIX}-nonexistent-module`);
        assert.strictEqual(
            plugins[TEST_MODULES[2]],
            `@opencensus/${Constants.DEFAULT_PLUGIN_PACKAGE_NAME_PREFIX}-http`);
        assert.strictEqual(
            plugins[TEST_MODULES[3]],
            `@opencensus/${
                Constants
                    .DEFAULT_PLUGIN_PACKAGE_NAME_PREFIX}-load-internal-file-module`);
      });
    });

    /** Should load the plugins. */
    describe('loadPlugins()', () => {
      it('sanity check', () => {
        const simpleModule = require(TEST_MODULES[0]);
        assert.strictEqual(simpleModule.name(), TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 100);
        assert.throws(() => require(TEST_MODULES[1]));
      });

      it('should load a plugin and patch the target modules', () => {
        const pluginLoader = new PluginLoader(log, tracer);
        assert.strictEqual(pluginLoader.plugins.length, 0);
        pluginLoader.loadPlugins(plugins);
        // The hook is only called the first time the module is loaded.
        const simpleModule = require(TEST_MODULES[0]);
        assert.strictEqual(pluginLoader.plugins.length, 1);
        assert.strictEqual(simpleModule.name(), 'patched-' + TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 101);
      });

      it('should load and patch extra plugin file', () => {
        const pluginLoader = new PluginLoader(log, tracer);
        assert.strictEqual(pluginLoader.plugins.length, 0);
        pluginLoader.loadPlugins(plugins);
        const moduleName = TEST_MODULES[3];
        const loadInternalFileModule = require(moduleName);
        assert.strictEqual(pluginLoader.plugins.length, 1);
        assert.strictEqual(
            loadInternalFileModule.name(), 'patched-' + moduleName);
        assert.strictEqual(loadInternalFileModule.value(), 111);

        const extraModuleName = 'extra-module';
        assert.strictEqual(
            loadInternalFileModule.extraName(), 'patched-' + extraModuleName);
        assert.strictEqual(loadInternalFileModule.extraValue(), 121);
      });


      it('should not load a non existing plugin and just log an erro', () => {
        const intercept = require('intercept-stdout');

        const pluginLoader = new PluginLoader(log, tracer);
        assert.strictEqual(pluginLoader.plugins.length, 0);
        pluginLoader.loadPlugins(plugins);
        const http = require(TEST_MODULES[2]);
        intercept((txt: string) => {
          assert.ok(txt.indexOf('error') >= 0);
        })();
        assert.strictEqual(pluginLoader.plugins.length, 0);
      });
    });

    /** Should unload the plugins. */
    describe('unloadPlugins()', () => {
      it('should unload the plugins and unpatch the target module', () => {
        const pluginLoader = new PluginLoader(log, tracer);
        assert.strictEqual(pluginLoader.plugins.length, 0);
        pluginLoader.loadPlugins(plugins);
        const simpleModule = require(TEST_MODULES[0]);
        assert.strictEqual(pluginLoader.plugins.length, 1);
        assert.strictEqual(simpleModule.name(), 'patched-' + TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 101);
        pluginLoader.unloadPlugins();
        assert.strictEqual(pluginLoader.plugins.length, 0);
        assert.strictEqual(simpleModule.name(), TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 100);
      });
    });

    // Should load/unload end-user (non-default named) plugin.
    describe('load/unload end-user pluging', () => {
      it('should load/unload patch/unpatch end-user plugins', () => {
        const pluginLoader = new PluginLoader(log, tracer);
        assert.strictEqual(pluginLoader.plugins.length, 0);

        const endUserPlugins = {
          'simple-module': 'enduser-simple-module-plugin'
        };
        pluginLoader.loadPlugins(endUserPlugins);
        const simpleModule = require(TEST_MODULES[0]);
        assert.strictEqual(pluginLoader.plugins.length, 1);
        assert.strictEqual(
            simpleModule.name(), 'my-patched-' + TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 102);
        pluginLoader.unloadPlugins();
        assert.strictEqual(pluginLoader.plugins.length, 0);
        assert.strictEqual(simpleModule.name(), TEST_MODULES[0]);
        assert.strictEqual(simpleModule.value(), 100);
      });
    });
  });
});
