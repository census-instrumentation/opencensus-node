/**
 * Copyright 2018, OpenCensus Authors
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

import * as logger from '../src/common/console-logger';
import {ConsoleLogger} from '../src/common/console-logger';
import {Logger} from '../src/common/types';


const LEVELS = ['silent', 'error', 'warn', 'info', 'debug', 'silly'];
let consoleTxt = '';

// TODO: Review test cases: Maybe testing the info log level is sufficient
// because it already shows that lower levels will log, and higher levels won't.

describe('ConsoleLogger', () => {
  const intercept = require('intercept-stdout');
  const unhookIntercept = intercept((txt: string) => {
    consoleTxt = txt;
    return txt;
  });

  /** Should create a new ConsoleLogger */
  describe('new ConsoleLogger()', () => {
    it('should log with default levels', () => {
      const consoleLogger = logger.logger();
      assert.equal(LEVELS.length, ConsoleLogger.LEVELS.length);
    });

    it('should log with error', () => {
      const consoleLogger = logger.logger(1);
      assert.strictEqual(LEVELS[1], consoleLogger.level);
    });
  });

  /** Should logger only error log */
  describe('error logger', () => {
    const consoleLogger = logger.logger(LEVELS[1]);

    it('should log error', () => {
      consoleTxt = '';
      consoleLogger.error('error test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('error');

      assert.ok(validateString >= 0);
    });

    it('should not log warn', () => {
      consoleTxt = '';
      consoleLogger.warn('warn test logger');
      unhookIntercept();

      const validateString = consoleTxt.indexOf('warn');

      assert.equal(validateString, -1);
    });

    it('should not log info', () => {
      consoleTxt = '';
      consoleLogger.info('info test logger');
      unhookIntercept();

      const validateString = consoleTxt.indexOf('info');

      assert.equal(validateString, -1);
    });

    it('should not log debug', () => {
      consoleTxt = '';
      consoleLogger.debug('debug test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('debug');

      assert.equal(validateString, -1);
    });

    it('should not log silly', () => {
      consoleTxt = '';
      consoleLogger.silly('silly test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('silly');

      assert.equal(validateString, -1);
    });
  });

  /** Should disable logger  */
  describe('silent logger', () => {
    const consoleLogger = logger.logger(0);

    it('should not log error', () => {
      consoleTxt = '';
      consoleLogger.error('error test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('error');

      assert.equal(validateString, -1);
    });

    it('should not log warn', () => {
      consoleTxt = '';
      consoleLogger.warn('warn test logger');
      unhookIntercept();

      const validateString = consoleTxt.indexOf('warn');

      assert.equal(validateString, -1);
    });

    it('should not log info', () => {
      consoleTxt = '';
      consoleLogger.info('info test logger');
      unhookIntercept();

      const validateString = consoleTxt.indexOf('info');

      assert.equal(validateString, -1);
    });

    it('should not log debug', () => {
      consoleTxt = '';
      consoleLogger.debug('debug test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('debug');

      assert.equal(validateString, -1);
    });

    it('should not log silly', () => {
      consoleTxt = '';
      consoleLogger.silly('silly test logger');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('silly');

      assert.equal(validateString, -1);
    });
  });
});
