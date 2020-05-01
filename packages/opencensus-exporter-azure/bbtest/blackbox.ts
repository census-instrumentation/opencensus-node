/**
 * Copyright 2020 OpenCensus Authors.
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

// Import Core OpenCensus and our Azure Exporter module.
const OpenCensus = require('@opencensus/core');
const AzureStats = require('../build/src/azure-stats');

function exportSingleMetrics() {
    // Construct and register an AzureStatsExporter with the OpenCensus library.
    const exporter = new AzureStats.AzureStatsExporter({
        instrumentationKey: 'xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        logger: new OpenCensus.logger.ConsoleLogger(process.argv[2] || 'info')
    });
    OpenCensus.globalStats.registerExporter(exporter);

    // Create a dummy metric.
    const mDummy = OpenCensus.globalStats.createMeasureInt64('test/dummy', OpenCensus.MeasureUnit.UNIT, 'This variable has absolutely no meaning.');

    // Create some dummy tags.
    const dumbTagKey = { name: 'dumb' };
    const dumberTagKey = { name: 'dumber' };
    const evenDumberTagKey = { name: 'evenDumber' };
    const dumbestTagKey = { name: 'dumbest' };

    // Create some dummy views.
    const sumView = OpenCensus.globalStats.createView(
        'dummy/sumView',
        mDummy,
        OpenCensus.AggregationType.SUM,
        [dumbTagKey],
        'A sum of the dummy measure.'
    );
    OpenCensus.globalStats.registerView(sumView);

    const distributionView = OpenCensus.globalStats.createView(
        'dummy/distView',
        mDummy,
        OpenCensus.AggregationType.DISTRIBUTION,
        [dumbTagKey, dumberTagKey],
        'A distribution of the dummy measure.',
        [0, 5, 10, 15, 20, 25, 30, 35, 40, 45]
    );
    OpenCensus.globalStats.registerView(distributionView);

    const countView = OpenCensus.globalStats.createView(
        'dummy/countView',
        mDummy,
        OpenCensus.AggregationType.COUNT,
        [dumbTagKey, dumberTagKey, evenDumberTagKey],
        'A count of the dummy measure.'
    );
    OpenCensus.globalStats.registerView(countView);

    const lastValueView = OpenCensus.globalStats.createView(
        'dummy/lastValueView',
        mDummy,
        OpenCensus.AggregationType.LAST_VALUE,
        [dumbTagKey, dumberTagKey, evenDumberTagKey, dumbestTagKey],
        'The last value of the dummy measure.'
    );
    OpenCensus.globalStats.registerView(lastValueView);

    // Loop through an arbitrary amount of numbers, and record them as 'metrics'.
    for (let i = 0; i < 42; i++) {
        // Create the tag map so we can set values for our dummy tags.
        const tags = new OpenCensus.TagMap();

        // Set a value for each.
        tags.set(dumbTagKey, { value: 'dumb' });
        tags.set(dumberTagKey, { value: 'dumber' });
        tags.set(evenDumberTagKey, { value: 'evenDumber' });
        tags.set(dumbestTagKey, { value: 'dumbest' });

        OpenCensus.globalStats.record([{
            measure: mDummy,
            value: i
        }], tags);

        // Do something special if i is greater than 30 so we have extra things to look for in
        // AppInsights.
        if (i > 30) {
            tags.set(dumbTagKey, { value: 'dumb but over 30' });
            OpenCensus.globalStats.record([{
                measure: mDummy,
                value: i
            }], tags);
        }
    }
}

exportSingleMetrics();
