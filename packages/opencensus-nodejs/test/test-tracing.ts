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
import * as core from '@opencensus/core';
import { DEFAULT_INSTRUMENTATION_MODULES } from '@opencensus/instrumentation-all';
import * as assert from 'assert';
import { Tracing } from '../src/trace/tracing';

describe('Tracing', () => {
  /** Should create a Tracing instance */
  describe('new Tracing()', () => {
    it('should create a Tracer instance', () => {
      const tracing = new Tracing();
      assert.ok(tracing instanceof Tracing);
    });
  });

  /** Should get the singleton trancing instance. */
  describe('static get instance()', () => {
    it('should get the singleton trancing instance', () => {
      const tracing = Tracing.instance;
      assert.ok(tracing instanceof Tracing);
    });
  });

  /** Should return a started tracing instance */
  describe('start()', () => {
    let aTracing: core.Tracing;
    const tracing = new Tracing();
    // tslint:disable:no-any
    beforeEach(() => {
      if (tracing.active) {
        tracing.stop();
      }
    });

    it('should return a tracing instance', () => {
      aTracing = tracing.start();
      assert.ok(aTracing instanceof Tracing);
      assert.ok(tracing.active);
      assert.ok(aTracing.tracer.active);
    });

    // TODO: Currently this test seems to need to change every time a new
    // configuration field is added.
    // Should be investigated a way to automatically do this

    describe('start with different config objects', () => {
      it('should start with default plugin list', () => {
        tracing.start();
        assert.ok(tracing.config.plugins);

        DEFAULT_INSTRUMENTATION_MODULES.forEach(pluginName => {
          if (tracing.config.plugins) {
            assert.ok(tracing.config.plugins[pluginName]);
            assert.strictEqual(
              tracing.config.plugins[pluginName],
              `@opencensus/instrumentation-${pluginName}`
            );
          }
        });
      });

      it('should start with an user-provided plugin list', () => {
        const endUserPlugins = {
          http: 'enduser-http-pluging',
          'simple-module': 'enduser-simple-module-pluging',
        };
        tracing.start({ plugins: endUserPlugins });
        assert.ok(tracing.config.plugins);
        if (tracing.config.plugins) {
          // should overwrite default http plugin
          assert.strictEqual(
            tracing.config.plugins['http'],
            endUserPlugins['http']
          );
          // should add a new plugin
          assert.strictEqual(
            tracing.config.plugins['simple-module'],
            endUserPlugins['simple-module']
          );
          // should keep plugins default value
          assert.strictEqual(
            tracing.config.plugins['https'],
            '@opencensus/instrumentation-https'
          );
        }
      });
    });
  });
});
