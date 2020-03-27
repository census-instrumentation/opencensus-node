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
    MetricDescriptorType,
} from '@opencensus/core';

import * as ApplicationInsights from 'applicationinsights';

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
        if (!options.instrumentationKey) {
            this.options.logger.error('You must provide a valid instrumentation key.');
            throw new IllegalOptionsError('You must provide a valid instrumentation key.');
        }

        this.setupAndStartApplicationInsights();
    }

    /**
     * Is called whenever a view is registered.
     * @param view The registered view.
     */
    onRegisterView(view: View): void {
    }    
    
    /**
     * Is called whenever a measure is recorded.
     * @param views The views related to the measurement.
     * @param measurement The recorded measurement.
     * @param tags The tags to which the value is applied.
     */
    // Use the App Insights SDK to track this measurement.
    // TODO: Try to break this out into smaller methods so we can clearly see
    // the inputs and outputs.
    onRecord(views: View[], measurement: Measurement, tags: Map<TagKey, TagValue>): void {
        let newMetric: MetricTelemetry = {
            name: measurement.measure.name,
            value: measurement.value
        };

        this.exportSingleMetric(newMetric);
        // ApplicationInsights.defaultClient.trackMetric(newMetric);
        // this.options.logger.debug('Tracked metric: ', newMetric);   
    }    

    /**
     * Creates an Azure Monitor Stats exporter with an AzureStatsExporterOptions.
     */
    start(): void {
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

        this.disposeApplicationInsights();
    }

    /**
     * Polls the Metrics library for all registered metrics and uploads these to Azure Monitor.
     */
    async export() {
        this.options.logger.info('Starting export of metric batch.');

        // Collect all of the metrics that will need to be exported in this batch.
        const metricList: Metric[] = [];
        const metricProducerManager: MetricProducerManager = Metrics.getMetricProducerManager();

        // According to OpenCensus documentation, MetricProducer.getMetrics() returns a list
        // of metrics to be exported, therefore we will use that function to retrieve metrics.
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
                case MetricDescriptorType.UNSPECIFIED:
                    // Log a warning as this type should not be used.
                    break;
                case MetricDescriptorType.GAUGE_INT64:
                case MetricDescriptorType.GAUGE_DOUBLE:
                    // Aggregate these by (averaging, mode, etc) and uploading just the average
                    break;
                case MetricDescriptorType.CUMULATIVE_INT64:
                case MetricDescriptorType.CUMULATIVE_DOUBLE:
                    // Likely these will be aggregated the same as above, but for now I am keeping them
                    // separate. If same aggregation procedures can be used, we will have all Int64/Doubles
                    // fall through into the same block.
                    break;
                case MetricDescriptorType.GAUGE_DISTRIBUTION:
                    // Need to look into how Azure monitor accepts distribution values.
                    break;
                case MetricDescriptorType.CUMULATIVE_DISTRIBUTION:
                    // Need to look into how Azure monitor accepts distribution values.
                    break;
                default:
            }
        }
    }

     /**
     * Uses the Application Insights SDK to export a given MetricTelemetry object
     * into Azure Monitor.
     * @param metric The MetricTelemetry object to export to Azure Monitor.
     */
    private exportSingleMetric(metric: MetricTelemetry){
        ApplicationInsights.defaultClient.trackMetric(metric);
        this.options.logger.debug('Tracked metric: ',metric); 
    }

    /**
     * Configures setup options and starts an Application Insights SDK client.
     */
    private setupAndStartApplicationInsights() {
        // Configure the Application Insights SDK to use the Instrumentation Key from our options.
        ApplicationInsights.setup(this.options.instrumentationKey).start();
    }

    /**
     * Disposes of the active Application Insights SDK client.
     */
    private disposeApplicationInsights() {
        // Pass the stop signal on to the App Insights SDK.
        ApplicationInsights.dispose();
        this.options.logger.info('Disposed App Insights SDK.');
    }

}
