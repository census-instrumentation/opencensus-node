import {
    Logger,
    globalStats,
    MeasureUnit,
    Metrics,
    Measure,
    AggregationType,
    TagKey,
    TagValue,
    TagMap,
    View,
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
    const mockLogger = new MockLogger();
    let exporterOptions: AzureStatsExporterOptions;
    let exporter: AzureStatsExporter;
    let measure: Measure;
    let measurement: Measurement;
    let aggregationType: AggregationType;
    const tagKeys = [{ name: 'testKey1' }, { name: 'testKey2' }];
    const tagValues = [{ value: 'testValue1' }, { value: 'testValue2' }];
    const tagMap = new TagMap();
    tagMap.set(tagKeys[0], tagValues[0]);
    tagMap.set(tagKeys[1], tagValues[1]);

    before(() => {
        exporterOptions = {
            instrumentationKey: '',
            logger: mockLogger,
        };
        exporter = new AzureStatsExporter(exporterOptions);
    });

    afterEach(() => {
        exporter.stop();
        mockLogger.cleanAll();
    });

    it('should not export for empty data', () => {
        globalStats.registerExporter(exporter);
        assert.strictEqual(mockLogger.debugBuffer.length, 0);
    });

    it('should export the data', async () => {
        const METRIC_NAME = 'metric-name';
        const METRIC_DESCRIPTION = 'metric-description';
        const UNIT = MeasureUnit.UNIT;
        const METRIC_OPTIONS = {
          description: METRIC_DESCRIPTION,
          unit: UNIT,
          labelKeys: [{ key: 'code', description: 'desc' }],
        };

        let views: View[] = [
            globalStats.createView(
                'test/firstView',
                measure,
                AggregationType.LAST_VALUE,
                tagKeys,
                'The first view'
            ),
            globalStats.createView(
                'test/secondView',
                measure,
                AggregationType.LAST_VALUE,
                tagKeys,
                'The second view'
            )
        ];
        let registeredViews: View[] = [];
        let recordedMeasurements: Measurement[] = [];
        let map: Map<TagKey, TagValue>;

        const metricRegistry = Metrics.getMetricRegistry();
        exporter.onRecord(views, measurement, map);


    });

});

describe('Batched Stats Exporter', () => {

});
