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

import * as types from './types';

const logDriver = require('log-driver');


/**
 * This class represente a console-logger
 */
class ConsoleLogger implements types.Logger {
  // tslint:disable:no-any
  private logger: any; 
  static LEVELS = ['error', 'warn', 'info', 'debug', 'silly'];

  /**
   * Constructs a new ConsoleLogger instance
   * @param options A logger configuration object.
   */
  constructor(options?: types.LoggerOptions|string) {
    let opt: types.LoggerOptions = {};
    if (typeof options === 'string') {
      opt = {level: options};
    } else {
      opt = options || {};
    }

    this.logger = logDriver({
      levels:  ConsoleLogger.LEVELS,
      level: opt.level || 'silly'
    });
  }

  /**
   * Logger error function.
   * @param message menssage erro to log in console
   * @param args arguments to log in console
   */
  // tslint:disable:no-any
  error(message: any, ...args: any[]): void {
    this.logger.error(arguments);
  }

  /**
   * Logger warning function.
   * @param message menssage warning to log in console
   * @param args arguments to log in console
   */
  // tslint:disable:no-any
  warn(message: any, ...args: any[]): void {
    this.logger.warn(arguments);
  }

  /**
   * Logger info function.
   * @param message menssage info to log in console
   * @param args arguments to log in console
   */
  // tslint:disable:no-any
  info(message: any, ...args: any[]): void {
    this.logger.info(arguments);
  }

  /**
   * Logger debug function.
   * @param message menssage debug to log in console
   * @param args arguments to log in console
   */
  // tslint:disable:no-any
  debug(message: any, ...args: any[]): void {
    this.logger.debug(arguments);
  }

  /**
   * Logger silly function.
   * @param message menssage silly to log in console
   * @param args arguments to log in console
   */
  // tslint:disable:no-any
  silly(message: any, ...args: any[]): void {
    this.logger.silly(arguments);
  }
}

let defaultLogger = null;

/**
 *  Function logger exported to others classes.
 * @param options A logger options or strig to logger in console
 */
const logger = (options?: types.LoggerOptions|string) => {
  defaultLogger = new ConsoleLogger(options);
  logger['logger'] = defaultLogger;
  return defaultLogger;
};

logger();

export{logger};