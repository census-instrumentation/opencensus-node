import {
    Logger,
    MeasureUnit,
    globalStats,
    Measurement
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

/**
 * Tests construction of the exporter.
 * Specifically, that instrumentation keys are valid.
 */
describe('Exporter Construction', () => {
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
        }, IllegalOptionsError, INVALID_INSTRUMENTATION_KEY_ERROR_MSG)
        assert(mockLogger.errorMessagesBuffer.length === 1, 'There was not exactly one error log.');
        assert(mockLogger.errorMessagesBuffer[0] === INVALID_INSTRUMENTATION_KEY_ERROR_MSG, 'Incorrect message given.');
    });

    it('Throws an error if the provided instrumentation key is an empty string.', () => {
        const options: AzureStatsExporterOptions = {
            instrumentationKey: '',
            logger: mockLogger
        };
        assert.throws(() => {
            // This should throw an error.
            exporter = new AzureStatsExporter(options);
        }, IllegalOptionsError, INVALID_INSTRUMENTATION_KEY_ERROR_MSG);
        assert(mockLogger.errorMessagesBuffer.length === 1, 'There was not exactly one error log.');
        assert(mockLogger.errorMessagesBuffer[0] === INVALID_INSTRUMENTATION_KEY_ERROR_MSG, 'Incorrect message given.');
    });
});

//Sends simple metric to onRecord method
//Checks Logger and hopefully telemetry object
describe('Single-Value Stats Exporting', () => {
    // Define dependencies for the exporter.
    const mockLogger = new MockLogger();
    let exporterOptions: AzureStatsExporterOptions;

    // Define the exporter itself.
    let exporter: AzureStatsExporter;

    // Define the test metric.
    const measure = globalStats.createMeasureDouble(
        'opencensus.io/test/double',
        MeasureUnit.UNIT,
        'Measure Double'
    );
    const measurement: Measurement = { measure: measure, value: 25 };
    
    let stub;

    before(() => {
        exporterOptions = {
            instrumentationKey: 'fake-instrumentation-key',
            logger: mockLogger,
        };
        exporter = new AzureStatsExporter(exporterOptions);
        stub = sinon.stub(exporter, "exportSingleMetric");
    });

    afterEach(() => {
        exporter.stop();
        mockLogger.cleanAll();
        globalStats.clear();
        stub.resetBehavior();
    });

    it('Should export a simple metric.', async () => {
        exporter.onRecord(undefined, measurement, undefined);
        assert(stub.called, 'Application Insights SDk was not called');
    });

});

describe('Batched Stats Exporter', () => {
    // TODO: Test batch functinoality once it has been implemented.
});
