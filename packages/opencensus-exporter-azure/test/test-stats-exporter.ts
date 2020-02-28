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
    errorMessagesBuffer: any[] = [];
  
    cleanAll() {
      this.debugBuffer = [];
      this.errorMessagesBuffer = [];
    }
  
    // tslint:disable-next-line:no-any
    debug(message: string, ...args: any[]) {
      this.debugBuffer.push(...args);
    }
  
    // tslint:disable-next-line:no-any
    error(message: string, ...args: any[]) {
        this.errorMessagesBuffer.push(message);
    }
    // tslint:disable-next-line:no-any
    warn(...args: any[]) {}
    // tslint:disable-next-line:no-any
    info(...args: any[]) {}
}

describe('Exporter Construction', () => {
    const UNDEFINED_INSTRUMENTATION_KEY_ERROR_MSG = 'You must provide an instrumentation key.';
    const INVALID_INSTRUMENTATION_KEY_ERROR_MSG = 'You must provide a valid instrumentation key.';

    let exporter: AzureStatsExporter;
    const mockLogger = new MockLogger();

    afterEach(() => {
        if (exporter) exporter.stop();
        mockLogger.cleanAll();
    });

    it('Throws an error if no instrumentation key is provided.', () => {
        const options: AzureStatsExporterOptions = {
            instrumentationKey: undefined,
            logger: mockLogger
        };
        assert.throws(() => {
            // This should throw an error.
            exporter = new AzureStatsExporter(options);
        }, IllegalOptionsError, UNDEFINED_INSTRUMENTATION_KEY_ERROR_MSG)
        assert(mockLogger.debugBuffer.length === 0, 'An unexpected debug log occured.');
        assert(mockLogger.errorMessagesBuffer.length === 1, 'There was not exactly one error log.');
        assert(mockLogger.errorMessagesBuffer[0] === UNDEFINED_INSTRUMENTATION_KEY_ERROR_MSG, 'Incorrect message given.');
    });

    it('Throws an error if the provided instrumentation key is an empty string.', () => {
        const options: AzureStatsExporterOptions = {
            instrumentationKey: ''
        };
        assert.throws(() => {
            // This should throw an error.
            exporter = new AzureStatsExporter(options);
        }, IllegalOptionsError, INVALID_INSTRUMENTATION_KEY_ERROR_MSG);
        assert(mockLogger.debugBuffer.length === 0, 'An unexpected debug log occured.');
        assert(mockLogger.errorMessagesBuffer.length === 1, 'There was not exactly one error log.');
        assert(mockLogger.errorMessagesBuffer[0] === INVALID_INSTRUMENTATION_KEY_ERROR_MSG, 'Incorrect message given.');
    });
});

describe('Single-Value Stats Exporting', () => {

});

describe('Batched Stats Exporter', () => {

});
