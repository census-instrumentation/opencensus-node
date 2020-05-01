import {
    Logger
  } from '@opencensus/core';
  import {
    AzureTraceExporter,
    AzureTraceExporterOptions,
  } from '../src/azure-trace';
  import {
    IllegalOptionsError
  } from '../src/azure-stats'
  import {
    describe,
    it,
    afterEach
  } from 'mocha';
  import { 
    assert
  } from 'chai';
  
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
  
  /**
  * Tests construction of the exporter.
  * Specifically, that instrumentation keys are valid.
  */
  describe('Exporter Construction', () => {
    const INVALID_INSTRUMENTATION_KEY_ERROR_MSG = 'You must provide a valid instrumentation key.';
  
    let exporter: AzureTraceExporter;
    const mockLogger = new MockLogger();
  
    afterEach(() => {
        mockLogger.cleanAll();
    });
  
    it('Throws an error if no instrumentation key is provided.', () => {
        const options: AzureTraceExporterOptions = {
            instrumentationKey: undefined,
            logger: mockLogger
        };
        assert.throws(() => {
            // This should throw an error.
            exporter = new AzureTraceExporter(options);
        }, IllegalOptionsError, INVALID_INSTRUMENTATION_KEY_ERROR_MSG)
        assert(mockLogger.errorMessagesBuffer.length === 1, 'There was not exactly one error log.');
        assert(mockLogger.errorMessagesBuffer[0] === INVALID_INSTRUMENTATION_KEY_ERROR_MSG, 'Incorrect message given.');
    });
  
    it('Throws an error if the provided instrumentation key is an empty string.', () => {
        const options: AzureTraceExporterOptions = {
            instrumentationKey: '',
            logger: mockLogger
        };
        assert.throws(() => {
            // This should throw an error.
            exporter = new AzureTraceExporter(options);
        }, IllegalOptionsError, INVALID_INSTRUMENTATION_KEY_ERROR_MSG);
        assert(mockLogger.errorMessagesBuffer.length === 1, 'There was not exactly one error log.');
        assert(mockLogger.errorMessagesBuffer[0] === INVALID_INSTRUMENTATION_KEY_ERROR_MSG, 'Incorrect message given.');
    });
  
    it('Attempts to start the exporter if a seemingly valid instrumentation key is provided.', () => {
        const options: AzureTraceExporterOptions = {
            instrumentationKey: 'seemingly-valid',
            logger: mockLogger
        };
        assert
    });
  });