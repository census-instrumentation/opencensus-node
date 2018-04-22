import * as path from 'path';
import { forkP } from './utils';
import * as ts from 'typescript';
import * as semver from 'semver';

export interface CompileOptions {
  strict: boolean;
  languageLevel: string;
}

export async function compile(options: CompileOptions) {
  let { strict, languageLevel } = options;
  if (languageLevel === 'auto') {
    languageLevel = semver.satisfies(process.version, '>=7.5') ? 'es6' : 'es5';
  }
  await forkP(`node_modules/.bin/tsc`, [
    '-p',
    strict ? '.' : './tsconfig.full.json',
    '--target',
    languageLevel
  ]);
}
