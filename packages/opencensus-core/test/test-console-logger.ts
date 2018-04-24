/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';
import * as mocha from 'mocha';

// import * as logger from '../src/common/console-logger';
import * as logger from '../src/common/console-logger';

import {Logger} from '../src/common/types';
import {Buffer} from '../src/exporters/buffer';
import {ConsoleExporter} from '../src/exporters/console-exporter';
import {BufferConfig, TracerConfig} from '../src/trace/config/types';
import {RootSpan} from '../src/trace/model/root-span';
import {Tracer} from '../src/trace/model/tracer';
import {TraceOptions} from '../src/trace/model/types';

const LEVELS = ['error', 'warn', 'info', 'debug', 'silly'];
let consoleTxt = '';

describe('ConsoleLogger', () => {
  const intercept = require('intercept-stdout');
  const unhookIntercept = intercept((txt) => {
    consoleTxt = txt;
    return txt;
  });

  /** Should create a new ConsoleLogger */
  describe('new ConsoleLogger()', () => {
    it('should consoleLogger with default levels', () => {
      const consoleLogger = logger.logger();
      assert.equal(LEVELS.length, consoleLogger.logger.levels.length);
    });

    it('should consoleLogger with error', () => {
      const consoleLogger = logger.logger(LEVELS[0]);
      assert.strictEqual(LEVELS[0], consoleLogger.logger.level);
    });
  });

  /** Should logger only error log */
  describe('error logger', () => {
    const consoleLogger = logger.logger(LEVELS[0]);

    it('should logger error', () => {
      consoleTxt = '';
      consoleLogger.error('error test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('error');

      assert.ok(validateString >= 0);
    });

    it('should not logger warn', () => {
      consoleTxt = '';
      consoleLogger.warn('warn test logger');
      unhookIntercept();

      const validateString = consoleTxt.indexOf('warn');

      assert.equal(validateString, -1);
    });

    it('should not logger info', () => {
      consoleTxt = '';
      consoleLogger.info('info test logger');
      unhookIntercept();

      const validateString = consoleTxt.indexOf('info');

      assert.equal(validateString, -1);
    });

    it('should not logger debug', () => {
      consoleTxt = '';
      consoleLogger.debug('debug test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('debug');

      assert.equal(validateString, -1);
    });

    it('should not logger silly', () => {
      consoleTxt = '';
      consoleLogger.silly('silly test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('silly');

      assert.equal(validateString, -1);
    });
  });

  /** Should logger error, warn and info log */
  describe('info logger', () => {
    const consoleLogger = logger.logger(LEVELS[2]);

    it('should logger error', () => {
      const intercept = require('intercept-stdout');
      const unhookIntercept = intercept((txt) => {
        consoleTxt = txt;
        return txt;
      });

      consoleTxt = '';
      consoleLogger.error('error test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('error');

      assert.ok(validateString >= 0);
    });

    it('should not logger warn', () => {
      const intercept = require('intercept-stdout');
      const unhookIntercept = intercept((txt) => {
        consoleTxt = txt;
        return txt;
      });

      consoleTxt = '';
      consoleLogger.warn('warn test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('warn');

      assert.ok(validateString >= 0);
    });

    it('should logger info', () => {
      const intercept = require('intercept-stdout');
      const unhookIntercept = intercept((txt) => {
        consoleTxt = txt;
        return txt;
      });

      consoleTxt = '';
      consoleLogger.info('info test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('info');

      assert.ok(validateString >= 0);
    });

    it('should not logger debug', () => {
      const intercept = require('intercept-stdout');
      const unhookIntercept = intercept((txt) => {
        consoleTxt = txt;
        return txt;
      });

      consoleTxt = '';
      consoleLogger.debug('debug test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('debug');

      assert.equal(validateString, -1);
    });

    it('should not logger silly', () => {
      const intercept = require('intercept-stdout');
      const unhookIntercept = intercept((txt) => {
        consoleTxt = txt;
        return txt;
      });

      consoleTxt = '';
      consoleLogger.silly('silly test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('silly');

      assert.equal(validateString, -1);
    });
  });

  describe('Model classes has a logger', () => {
    // tslint:disable:no-any
    function instanceOfLogger(object: any): object is Logger {
      return 'error' in object && 'warn' in object && 'info' in object &&
          'debug' in object && 'silly' in object;
    }

    const consoleLogger = logger.logger('debug');

    const tracer = new Tracer();
    tracer.start({logger: consoleLogger});

    it('checks if Tracer has a logger', () => {
      assert.ok(instanceOfLogger(tracer.logger));
    });

    it('checks if RootSpanImpl and SpanImpl has a logger', () => {
      tracer.startRootSpan({name: 'rootSpanTest'} as TraceOptions, (root) => {
        assert.ok(instanceOfLogger(root.logger));

        const span = tracer.startSpan('spanTest');
        assert.ok(instanceOfLogger(span.logger));
      });
    });

    const exporterConfig = {logger: consoleLogger};
    const exporter = new ConsoleExporter(exporterConfig);

    it('checks if exporter has a logger', () => {
      assert.ok(instanceOfLogger(exporter.logger));
    });

    it('checks if buffer has a logger', () => {
      const buffer = new Buffer(exporter, exporterConfig);
      assert.ok(instanceOfLogger(buffer.logger));
    });
  });
});