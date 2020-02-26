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
