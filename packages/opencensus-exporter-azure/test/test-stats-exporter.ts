import {
    Logger
} from '@opencensus/core';
import {
    AzureStatsExporter,
    AzureStatsExporterOptions,
    IllegalOptionsError
} from '../src/azure-stats';
import {
    describe,
    it
} from 'mocha';
import { 
    assert
} from 'chai';
import * as sinon from 'sinon';

class MockLogger implements Logger {
    level?: string;
    // tslint:disable-next-line:no-any
    debugBuffer: any[] = [];
  
    cleanAll() {
      this.debugBuffer = [];
    }
  
    // tslint:disable-next-line:no-any
    debug(message: string, ...args: any[]) {
      this.debugBuffer.push(...args);
    }
  
    // tslint:disable-next-line:no-any
    error(...args: any[]) {}
    // tslint:disable-next-line:no-any
    warn(...args: any[]) {}
    // tslint:disable-next-line:no-any
    info(...args: any[]) {}
  }

describe('Exporter Construction', () => {
    const sandbox = sinon.createSandbox();

    it('Throws an error if no instrumentation key is provided.', () => {
        const options: AzureStatsExporterOptions = {
            instrumentationKey: undefined
        };
        assert.throws(() => {
            // This should throw an error.
            const exporter = new AzureStatsExporter(options);
        }, IllegalOptionsError, 'You must provide an instrumentation key.')
    });

    it('Throws an error if the provided instrumentation key is an empty string.', () => {
        const options: AzureStatsExporterOptions = {
            instrumentationKey: ''
        };
        assert.throws(() => {
            // This should throw an error.
            const exporter = new AzureStatsExporter(options);
        }, IllegalOptionsError, 'You must provide a valid instrumentation key.');
    });
});

describe('Single-Value Stats Exporting', () => {

});

describe('Batched Stats Exporter', () => {

});
