import {
    ExporterConfig,
    StatsEventListener,
    View,
    Measurement,
    TagKey,
    TagValue,
    logger,
    Logger,
    Metric,
    MetricProducerManager,
    Metrics,
    Measure,
    AggregationData,
} from '@opencensus/core';

import { 
    start as startAppInsights, 
    setup as setupAppInsights,
    dispose as disposeAppInsights,
    defaultClient as telemetry,
} from 'applicationinsights';

import {
    MetricTelemetry
} from 'applicationinsights/out/Declarations/Contracts';

export interface StatsParams {
    registeredViews: View[];
    registeredMeasures: Measure[];
    recordedData: { [key: string]: AggregationData[] };
}

/**
 * Options for Azure Monitor configuration.
 */
export interface AzureStatsExporterOptions extends ExporterConfig {

    /**
     * The Instrumentation Key found in your application's Azure Monitor Application Insights
     * Overview page. Required.
     */
    instrumentationKey: string;

    /**
     * If specified, defines the number of milliseconds between uploading metrics
     * to Azure Monitor. Optional, defaults to 60,000 (1 minute).
     */
    periodInMillis?: number;

    /**
     * If specified, this will override the default OpenCensus prefix of an
     * Azure Monitor metric. Optional.
     */
    prefix?: string;

    /**
     * If specified, this will serve as the logger used by the exporter.
     * Optional, default to use whatever logger is registered with OpenCensus.
     */
    logger?: Logger;

    /**
     * If specified, this function will be called whenever an error occurs uploading
     * stats to Azure monitor. Optional.
     */
    onMetricUploadError?: (err: Error) => void;

}

export class IllegalOptionsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IllegalOptionsError';
    }
}

/**
 * Configuration defaults for an AzureStatsExporter.
 */
const AZURE_STATS_EXPORTER_DEFAULTS: AzureStatsExporterOptions = {
    instrumentationKey: 'undefined',
    periodInMillis: 60000,
    prefix: 'OpenCensus',
    logger: logger.logger()
}

/**
 * Formats and sends Stats to Azure Monitor.
 */
export class AzureStatsExporter implements StatsEventListener {
    // Define the options that will be used within the exporter.
    private options: AzureStatsExporterOptions;

    // Define all other exporter variables.
    private timer: NodeJS.Timer;

    private statsParams: StatsParams = {
        registeredViews: [],
        registeredMeasures: [],
        recordedData: {},
      };

    /**
     * Configures a new Stats Exporter given a set of options.
     * @param options Specific configuration information to use when constructing the exporter.
     */
    constructor(options: AzureStatsExporterOptions) {
        // Start with the default options, and overwrite the defaults with any options specified
        // in the constructor's options parameter. We do this before validating input so that
        // the logger gets configured with the user specified logger, if provided.
        this.options = { ...AZURE_STATS_EXPORTER_DEFAULTS, ...options };

        // Verify that the options passed in have actual values (no undefined values)
        // for require parameters.
        if (options.instrumentationKey === undefined) {
            this.options.logger.error('You must provide an instrumentation key.');
            throw new IllegalOptionsError('You must provide an instrumentation key.');
        } 

        if (options.instrumentationKey === '') {
            this.options.logger.error('You must provide a valid instrumentation key.');
            throw new IllegalOptionsError('You must provide a valid instrumentation key.');
        }

        // Configure the Application Insights SDK to use the Instrumentation Key from our options.
        setupAppInsights(this.options.instrumentationKey);
    }

    /**
     * Is called whenever a view is registered.
     * @param view The registered view.
     */
    onRegisterView(view: View): void {
            // Adds the view to registeredViews array if it doesn't contain yet
        if (!this.statsParams.registeredViews.find(v => v.name === view.name)) {
            this.statsParams.registeredViews.push(view);
        }
        // Adds the measure to registeredMeasures array if it doesn't contain yet
        if (
            !this.statsParams.registeredMeasures.find(
            m => m.name === view.measure.name
            )
        ) {
            this.statsParams.registeredMeasures.push(view.measure);
        }
        
    }    
    
    /**
     * Is called whenever a measure is recorded.
     * @param views The views related to the measurement.
     * @param measurement The recorded measurement.
     * @param tags The tags to which the value is applied.
     */
    // Use the App Insights SDK to track this measurement.
    // TODO: Build out the MetricTelemetry object to pass to the SDK.
    // TODO: Try to break this out into smaller methods so we can clearly see
    // the inputs and outputs.
    onRecord(
        views: View[],
        measurement: Measurement,
        tags: Map<TagKey, TagValue>
        ): void {
        const tagValues = [...tags.values()];
        views.map(view => {
            const snapshot = view.getSnapshot(tagValues);
            // Check if there is no data for the current view
            if (!this.statsParams.recordedData[view.name]) {
            this.statsParams.recordedData[view.name] = [snapshot];
            } else if (
            !this.statsParams.recordedData[view.name].find(s => s === snapshot)
            ) {
            // Push the snapshot if it hasn't recoreded before
            this.statsParams.recordedData[view.name].push(snapshot);
            }
        });
        let newMetric: MetricTelemetry;
        newMetric = {
            name: measurement.measure.name,
            value: measurement.value
        };

        // let tagMapAsStrings: {
        //     [key: string]: string;
        // }[] = [];

        // for (let key in tags.keys()) {
        //     tagMapAsStrings.push(

        //     )
        // }

        // let mapIter = tags.entries();
        // let tagsString: {
        //     [key: string]: string;
        // } = {}; 
        // for(let i =0; i < tags.size; i++){
        //    tagsString = tagsString + tags[i] as {key: string};
        // }       
        // newMetric.properties = tagsString;
        telemetry.trackMetric(newMetric);   
    }
    
    // var newMetric: Contracts.MetricTelemetry;
    // newMetric.name = measurement.measure.name;
    // newMetric.value = measurement.value;
    // var mapIter = tags.entries();

    // newMetric.properties = mapIter.next().value;

    // telemetry.trackMetric(newMetric);
    

    /**
     * Creates an Azure Monitor Stats exporter with an AzureStatsExporterOptions.
     */
    start(): void {
        // Start the App Insights SDK.
        startAppInsights();
        this.options.logger.info('Started App Insights SDK.');

        // Set a timer using the interval (period) defined in the exporter's options.
        // Each time the timer ticks, export any data that has been tracked by utilizing
        // the exporter's export() function.
        this.timer = setInterval(async () => {
            try {
                await this.export();
            } catch (err) {
                if (typeof this.options.onMetricUploadError === 'function') {
                    this.options.onMetricUploadError(err);
                }
            }
        }, this.options.periodInMillis);
        this.options.logger.info('Set export interval to ' + this.options.periodInMillis + ' ms.');
    }

    /**
     * Clear the interval timer to stop uploading metrics. It should be called
     * whenever the exporter is not needed anymore.
     */
    stop(): void {
        // Stop the timer.
        clearInterval(this.timer);
        this.options.logger.info('Clearing export interval.');

        // Pass the stop signal on to the App Insights SDK.
        disposeAppInsights();
        this.options.logger.info('Disposed App Insights SDK.')
    }

    /**
     * Polls the Metrics library for all registered metrics and uploads these to Azure Monitor.
     */
    async export() {
        this.options.logger.info('Starting export of metric batch.');

        // Collect all of the metrics that will need to be exported in this batch.
        const metricList: Metric[] = [];
        const metricProducerManager: MetricProducerManager = Metrics.getMetricProducerManager();

        for (const metricProducer of metricProducerManager.getAllMetricProducer()) {
            for (const metric of metricProducer.getMetrics()) {
                if (metric) {
                    metricList.push(metric);
                }
            }
        }

        // Aggregate each metric before sending them to Azure Monitor.
        // TODO: Aggregate metrics.
        for (const metric of metricList) {
            switch (metric.descriptor.type) {
                default:
            }
        }
    }

}
