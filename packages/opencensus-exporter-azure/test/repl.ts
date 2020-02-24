/**
 * This file is a simple Read, Execute, and Print loop to test sending
 * metrics to Azure Monitor.
 */
import {
    globalStats,
    MeasureUnit,
    AggregationType,
    TagMap
} from '@opencensus/core';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { AzureStatsExporter } from '../src/';

const exporter = new AzureStatsExporter({
    instrumentationKey: 'e3efe46f-5f1e-4b96-80de-60667b680b23'
});
globalStats.registerExporter(exporter);

const stream = createReadStream('./test.txt');
const lineReader = createInterface({ input: stream });

// Configure OpenCensus Telemetry Tracking
const mLatencyMs = globalStats.createMeasureDouble('repl/latency', MeasureUnit.MS, 'The latency in milliseconds per REPL loop.');
const mLineLengths = globalStats.createMeasureInt64('repl/line_lengths', MeasureUnit.BYTE, 'The distribution of line lengths.');

const methodTagKey = { name: 'method' };
const statusTagKey = { name: 'status' };
const errorTagKey = { name: 'error' };

const latencyView = globalStats.createView(
    'demo/latency',
    mLatencyMs,
    AggregationType.DISTRIBUTION,
    [methodTagKey, statusTagKey, errorTagKey],
    'The distribution of the latencies',
    [0, 25, 50, 75, 100, 200, 400, 600, 800, 1000, 2000, 4000, 6000]
);
globalStats.registerView(latencyView);

const lineCountView = globalStats.createView(
    'demo/lines_in',
    mLineLengths,
    AggregationType.COUNT,
    [methodTagKey],
    'The number of lines form standard input.'
);
globalStats.registerView(lineCountView);

const lineLengthView = globalStats.createView(
    'demo/line_lengths',
    mLineLengths,
    AggregationType.DISTRIBUTION,
    [methodTagKey],
    'Groups the lengths of keys in buckets.',
    [0, 5, 10, 15, 20, 40, 60, 80, 100, 200, 400, 600, 800, 1000]
);
globalStats.registerView(lineLengthView);

let startTime = new Date();
let endTime;

lineReader.on('line', function (line) {
    const tags = new TagMap();
    tags.set(methodTagKey, { value: 'REPL' });
    tags.set(statusTagKey, { value: 'OK' });

    try {
        const processedLine = processLine(line);
        console.log(processedLine);

        globalStats.record([{
            measure: mLineLengths,
            value: processedLine.length
        }, {
            measure: mLatencyMs,
            value: (new Date()).getTime() - startTime.getTime()
        }], tags);
    } catch (err) {
        const errTags = new TagMap();
        errTags.set(methodTagKey, { value: 'REPL' });
        errTags.set(statusTagKey, { value: 'ERROR' });
        errTags.set(errorTagKey, { value: err.message });

        globalStats.record([{
            measure: mLatencyMs,
            value: (new Date()).getTime() - startTime.getTime()
        }], errTags);
    }

    startTime = new Date();
});

function processLine(line) {
    return line.toUpperCase();
}