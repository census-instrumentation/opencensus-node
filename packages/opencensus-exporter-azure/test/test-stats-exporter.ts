/**
 * Copyright 2018 OpenCensus Authors.
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

import {
    Logger,
    MeasureUnit,
    globalStats,
    Measurement,
    AggregationType
} from '@opencensus/core';
import {
    AzureStatsExporter,
} from '../src/azure-stats';
import {
    AzureStatsExporterOptions,
    IllegalOptionsError
} from '../src/types';
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
    infoBuffer: any[] = [];
  
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
    info(message: string, ...args: any[]) {
        this.infoBuffer.push(message);
    }
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

    it('Attempts to start the exporter if a seemingly valid instrumentation key is provided.', () => {
        const options: AzureStatsExporterOptions = {
            instrumentationKey: 'seemingly-valid',
            logger: mockLogger
        };
        assert
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

    it('Should export a simple metric.', () => {
        exporter.onRecord(undefined, measurement, undefined);
        assert(stub.called, 'Application Insights SDk was not called');
    });

});

describe('Batch Functionality', () => {
    const mockLogger = new MockLogger();
    let exporterOptions: AzureStatsExporterOptions;

    let exporter: AzureStatsExporter;

    const measure = globalStats.createMeasureDouble(
        'opencensus.io/test/doule',
        MeasureUnit.UNIT,
        'Measure Double'
    );

    const view = globalStats.createView(
        'test/view',
        measure,
        AggregationType.COUNT,
        null,
        'This is a test view.'
    );

    before(() => {
        exporterOptions = {
            instrumentationKey: 'fake-instrumentation-key',
            logger: mockLogger
        };
        exporter = new AzureStatsExporter(exporterOptions);
    });

    afterEach(() => {
        exporter.stop();
        mockLogger.cleanAll();
        globalStats.clear();
    });

    it('Should register the metric contained within a view, when a new view is registered.', () => {
        exporter.onRegisterView(view);
        assert(mockLogger.infoBuffer.length === 1, 'There was not an info log message.');
        assert(mockLogger.infoBuffer[0] === 'Now tracking measure: ' + measure.name)
    });
});