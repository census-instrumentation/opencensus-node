/**
 * This file is a simple Read, Execute, and Print loop to test sending
 * metrics to Azure Monitor.
 */
const oc = require('@opencensus/core');
const fs = require('fs');
const readline = require('readline');
const statsExporterModule = require('./build/src/azure-stats');

const exporter = new statsExporterModule.AzureStatsExporter({
    instrumentationKey: 'e3efe46f-5f1e-4b96-80de-60667b680b23'
});
exporter.start();
oc.globalStats.registerExporter(exporter);

const stream = fs.createReadStream('./test/test.txt');
const lineReader = readline.createInterface({ input: stream });

// Configure OpenCensus Telemetry Tracking
const mLatencyMs = oc.globalStats.createMeasureDouble('repl/latency', oc.MeasureUnit.MS, 'The latency in milliseconds per REPL loop.');
const mLineLengths = oc.globalStats.createMeasureInt64('repl/line_lengths', oc.MeasureUnit.BYTE, 'The distribution of line lengths.');

const methodTagKey = { name: 'method' };
const statusTagKey = { name: 'status' };
const errorTagKey = { name: 'error' };

const latencyView = oc.globalStats.createView(
    'demo/latency',
    mLatencyMs,
    oc.AggregationType.DISTRIBUTION,
    [methodTagKey, statusTagKey, errorTagKey],
    'The distribution of the latencies',
    [0, 25, 50, 75, 100, 200, 400, 600, 800, 1000, 2000, 4000, 6000]
);
oc.globalStats.registerView(latencyView);

const lineCountView = oc.globalStats.createView(
    'demo/lines_in',
    mLineLengths,
    oc.AggregationType.COUNT,
    [methodTagKey],
    'The number of lines form standard input.'
);
oc.globalStats.registerView(lineCountView);

const lineLengthView = oc.globalStats.createView(
    'demo/line_lengths',
    mLineLengths,
    oc.AggregationType.DISTRIBUTION,
    [methodTagKey],
    'Groups the lengths of keys in buckets.',
    [0, 5, 10, 15, 20, 40, 60, 80, 100, 200, 400, 600, 800, 1000]
);
oc.globalStats.registerView(lineLengthView);

let startTime = new Date();

lineReader.on('line', function (line) {
    const tags = new oc.TagMap();
    tags.set(methodTagKey, { value: 'REPL' });
    tags.set(statusTagKey, { value: 'OK' });

    try {
        const processedLine = processLine(line);
        console.log(processedLine);

        oc.globalStats.record([{
            measure: mLineLengths,
            value: processedLine.length
        }, {
            measure: mLatencyMs,
            value: (new Date()).getTime() - startTime.getTime()
        }], tags);
    } catch (err) {
        const errTags = new oc.TagMap();
        errTags.set(methodTagKey, { value: 'REPL' });
        errTags.set(statusTagKey, { value: 'ERROR' });
        errTags.set(errorTagKey, { value: err.message });

        oc.globalStats.record([{
            measure: mLatencyMs,
            value: (new Date()).getTime() - startTime.getTime()
        }], errTags);
    }

    startTime = new Date();
});

function processLine(line) {
    return line.toUpperCase();
}
