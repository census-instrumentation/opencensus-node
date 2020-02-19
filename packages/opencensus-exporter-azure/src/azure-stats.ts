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
    Metrics
} from '@opencensus/core';

import { 
    start as startAppInsights, 
    setup as setupAppInsights,
    dispose as disposeAppInsights,
    defaultClient as telemetry
} from 'applicationinsights';

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
    period?: number;

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

/**
 * Configuration defaults for an AzureStatsExporter.
 */
const AzureStatsExporterDefaults: AzureStatsExporterOptions = {
    instrumentationKey: undefined,
    period: 60000,
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

    /**
     * Configures a new Stats Exporter given a set of options.
     * @param options Specific configuration information to use when constructing the exporter.
     */
    constructor(options: AzureStatsExporterOptions) {
        // Verify that the options passed in have actual values (no undefined values)
        // for require parameters.
        if (options.instrumentationKey === undefined) {
            AzureStatsExporterDefaults.logger.error('You must specify an Instrumentation Key to create an Azure Monitor Stats Exporter.');
        } 

        // Start with the default options, and overwrite the defaults with any options specified
        // in the constructor's options parameter.
        this.options = { ...AzureStatsExporterDefaults, ...options };

        // Configure the Application Insights SDK to use the Instrumentation Key from our options.
        setupAppInsights(this.options.instrumentationKey);
    }

    /**
     * Is called whenever a view is registered.
     * @param view The registered view.
     */
    onRegisterView(view: View): void {
        throw new Error("Method not implemented.");
    }    
    
    /**
     * Is called whenever a measure is recorded.
     * @param views The views related to the measurement.
     * @param measurement The recorded measurement.
     * @param tags The tags to which the value is applied.
     */
    onRecord(views: View[], measurement: Measurement, tags: Map<TagKey, TagValue>): void {
        // Use the App Insights SDK to track this measurement.
        // TODO: Build out the MetricTelemetry object to pass to the SDK.
        telemetry.trackMetric(undefined);
    }

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
        }, this.options.period);
        this.options.logger.info('Set export interval to ' + this.options.period + ' ms.');
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
        
    }

}