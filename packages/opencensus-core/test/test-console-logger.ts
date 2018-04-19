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
import * as logger from '../src/common/consolelogger';

const LEVELS = ['error', 'warn', 'info', 'debug', 'silly'];
let consoleTxt = '';




describe('ConsoleLogger', () => {
  const intercept = require('intercept-stdout');
  const unhookIntercept = intercept((txt) => {
    consoleTxt = txt;
    return txt;
  });
  describe('new ConsoleLogger()', () => {
    it('should levels from consoleLogger equals default levels', () => {
      const consoleLogger = logger();
      assert.equal(LEVELS.length, consoleLogger.logger.levels.length);
    });

    it('should level from consoleLogger equal error', () => {
      const consoleLogger = logger(LEVELS[0]);
      assert.strictEqual(LEVELS[0], consoleLogger.logger.level);
    });
  });

  /**
   * 
   */
  describe('error logger', () => {
    const consoleLogger = logger(LEVELS[0]);

    it('should logger error in console', () => {
      consoleTxt = '';
      consoleLogger.error('error test logger in console');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('error');

      assert.ok(validateString >= 0);
    });

    it('should not logger warn in console', () => {
      consoleTxt = '';
      consoleLogger.warn('warn test logger in console');
      unhookIntercept();

      const validateString = consoleTxt.indexOf('warn');

      assert.equal(validateString, -1);
    });

    it('should not logger info in console', () => {
      consoleTxt = '';
      consoleLogger.info('info test logger in console');
      unhookIntercept();

      const validateString = consoleTxt.indexOf('info');

      assert.equal(validateString, -1);
    });

    it('should not logger debug in console', () => {
      consoleTxt = '';
      consoleLogger.debug('debug test logger in console');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('debug');

      assert.equal(validateString, -1);
    });

    it('should not logger silly in console', () => {
      consoleTxt = '';
      consoleLogger.silly('silly test logger in console');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('silly');

      assert.equal(validateString, -1);
    });
  });

   describe('info logger', () => {
     
    const consoleLogger = logger(LEVELS[2]);

    it('should logger error in console', () => {
      const intercept = require('intercept-stdout');
      const unhookIntercept = intercept((txt) => {
        consoleTxt = txt;
        return txt;
      });
  
      consoleTxt = '';
      consoleLogger.error('error test logger in console');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('error');

      assert.ok(validateString >= 0);
    });

    it('should not logger warn in console', () => {
      const intercept = require('intercept-stdout');
      const unhookIntercept = intercept((txt) => {
        consoleTxt = txt;
        return txt;
      });
  
      consoleTxt = '';
      consoleLogger.warn('warn test logger in console');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('warn');

      assert.ok(validateString >= 0);
    });

    it('should logger info in console', () => {
      const intercept = require('intercept-stdout');
      const unhookIntercept = intercept((txt) => {
        consoleTxt = txt;
        return txt;
      });
  
      consoleTxt = '';
      consoleLogger.info('info test logger in console');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('info');

      assert.ok(validateString >= 0);
    });

    it('should not logger debug in console', () => {
      const intercept = require('intercept-stdout');
      const unhookIntercept = intercept((txt) => {
        consoleTxt = txt;
        return txt;
      });
  
      consoleTxt = '';
      consoleLogger.debug('debug test logger in console');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('debug');

      assert.equal(validateString, -1);
    });

    it('should not logger silly in console', () => {
      const intercept = require('intercept-stdout');
      const unhookIntercept = intercept((txt) => {
        consoleTxt = txt;
        return txt;
      });
  
      consoleTxt = '';
      consoleLogger.silly('silly test logger in console');
      unhookIntercept();
      const validateString = consoleTxt.indexOf('silly');

      assert.equal(validateString, -1);
    });
  });
  
});