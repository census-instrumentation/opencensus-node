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

import {Logger, LoggerOptions} from './types';

const logDriver = require('log-driver');


 class ConsoleLogger implements Logger {

  // tslint:disable:no-any
  private logger:any; 
  static LEVELS = ['error', 'warn', 'info', 'debug', 'silly'];

  constructor(options?: LoggerOptions|string) {
    let opt: LoggerOptions = {};
    if (typeof options === "string") {
      opt = {
        level: options
      };
    } else {
      opt = options || {};
    }

    this.logger = logDriver({
      levels:  ConsoleLogger.LEVELS,
      level: opt.level || 'error'
    });
  }

  // tslint:disable:no-any
  error(message: any, ...args: any[]): void {
    this.logger.error(arguments);
  }

  // tslint:disable:no-any
  warn(message: any, ...args: any[]): void {
    this.logger.warn(arguments);
  }

  // tslint:disable:no-any
  info(message: any, ...args: any[]): void {
    this.logger.info(arguments);
  }

  // tslint:disable:no-any
  debug (message: any, ...args: any[]): void {
    this.logger.debug(arguments);
  }

  // tslint:disable:no-any
  silly (message: any, ...args: any[]): void {
    this.logger.silly(arguments);
  }
}

let defaultLogger = null;

const logger  = (options?: LoggerOptions|string) => {
  defaultLogger = new ConsoleLogger(options);
  logger['logger'] = defaultLogger;
  return defaultLogger;
};

logger();

export = logger;