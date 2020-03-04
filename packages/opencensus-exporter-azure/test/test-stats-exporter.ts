import {
    Logger,
    MeasureUnit,
    Metrics,
    globalStats,
    Measure,
    AggregationType,
    TagKey,
    TagValue,
    TagMap,
    View,
    Measurement,
    MeasureType
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
    const mockLogger = new MockLogger();
    let exporterOptions: AzureStatsExporterOptions;
    let exporter: AzureStatsExporter;
    let measure: Measure;
    let measurement: Measurement;
    let aggregationType: AggregationType;
    const tagKeys = [{ name: 'testKey1' }, { name: 'testKey2' }];
    const tagValues = [{ value: 'testValue1' }, { value: 'testValue2' }];

    const measureDouble = globalStats.createMeasureDouble(
        'opencensus.io/test/double',
        MeasureUnit.UNIT,
        'Measure Double'
      );
    const measurement1: Measurement = { measure: measureDouble, value: 25 };
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

    it('should not export for empty data', () => {
        globalStats.registerExporter(exporter);
        assert.strictEqual(mockLogger.debugBuffer.length, 0);
    });

    it('should export the data', async () => {
        const METRIC_NAME = 'metric-name';
        const METRIC_DESCRIPTION = 'metric-description';
        const METRIC_OPTIONS = {
          description: METRIC_DESCRIPTION,
          labelKeys: [{ key: 'code', description: 'desc' }],
        };

        let views: View[] = [
            globalStats.createView(
                'test/firstView',
                measureDouble,
                AggregationType.LAST_VALUE,
                tagKeys,
                'The first view'
            ),
            globalStats.createView(
                'test/secondView',
                measureDouble,
                AggregationType.LAST_VALUE,
                tagKeys,
                'The second view'
            )
        ];
        let map =  new Map(); //Map<TagKey, TagValue>;
        map.set(tagKeys[0], tagValues[0]);
        map.set(tagKeys[1], tagValues[1]);

        const metricRegistry = Metrics.getMetricRegistry();
        const gauge = metricRegistry.addInt64Gauge(METRIC_NAME, METRIC_OPTIONS);
        gauge.getDefaultTimeSeries().add(100);

        await exporter.onRecord(views, measurement1, map);
        // assert.strictEqual(mockLogger.debugBuffer.length, 1);
        assert(stub.called,"Application Insights SDk was not called");

    });

});

describe('Batched Stats Exporter', () => {

});
