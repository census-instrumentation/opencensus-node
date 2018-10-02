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

import { ChildProcess, ForkOptions, fork } from 'child_process';
import * as once from 'once';

function promisifyChildProcess(childProcess: ChildProcess): Promise<void> {
    return new Promise((resolve, reject) => {
      const exit = (err?: Error) => once(() => err ? reject(err) : resolve())();
      childProcess.on('error', exit);
      childProcess.on('close', (code) => {
        if (code === 0) {
          exit();
        } else {
          exit(new Error(`Process ${childProcess.pid} exited with code ${code}.`));
        }
      });
    });
  }

export function forkP(moduleName: string, args?: string[], options?: ForkOptions): Promise<void> {
    const stringifiedCommand = `\`${moduleName}${args ? (' ' + args.join(' ')) : ''}\``;
    console.log(`> Running: ${stringifiedCommand}`);
    return promisifyChildProcess(fork(moduleName, args, Object.assign({
      stdio: 'inherit'
    }, options)));
  }