import {
    ExporterConfig,
    StatsEventListener,
    clear
} from '@opencensus/core';

/**
 * Options for Azure Monitor configuration.
 */
export interface AzureStatsExporterOptions extends ExporterConfig {

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

}

/**
 * Formats and sends Stats to Azure Monitor.
 */
export class AzureStatsExporter implements StatsEventListener {
    // Define configurable variables.
    private period: number;
    private metricPrefix: string;
    private onMetricUploadError?: (err: Error) => void;

    // Define defaults for each configurable variable.
    private static readonly PERIOD: number = 60000;
    private static readonly METRIC_PREFIX: string = 'OpenCensus';

    // Define all other exporter variables.
    private timer: NodeJS.Timer;

    constructor(options: AzureStatsExporterOptions) {
        this.period = options.period !== undefined ? options.period : AzureStatsExporter.PERIOD;
        this.metricPrefix = options.prefix !== undefined ? options.prefix : AzureStatsExporter.METRIC_PREFIX;
    }

    /**
     * Is called whenever a view is registered.
     * @param view The registered view.
     */
    onRegisterView(view: import("@opencensus/core").View): void {
        throw new Error("Method not implemented.");
    }    
    
    /**
     * Is called whenever a measure is recorded.
     * @param views The views related to the measurement
     * @param measurement The recorded measurement
     * @param tags The tags to which the value is applied
     */
    onRecord(views: import("@opencensus/core").View[], measurement: import("@opencensus/core").Measurement, tags: Map<import("@opencensus/core").TagKey, import("@opencensus/core").TagValue>): void {
        throw new Error("Method not implemented.");
    }

    /**
     * Creates an Azure Monitor Stats exporter with an AzureStatsExporterOptions.
     */
    start(): void {
        this.timer = setInterval(async () => {
            try {
                await this.export();
            } catch (err) {
                if (typeof this.onMetricUploadError === 'function') {
                    this.onMetricUploadError(err);
                }
            }
        }, this.period);
    }

    /**
     * Clear the interval timer to stop uploading metrics. It should be called
     * whenever the exporter is not needed anymore.
     */
    stop(): void {
        clearInterval(this.timer);
    }

    /**
     * Polls the Metrics library for all registered metrics and uploads these to Azure Monitor.
     */
    async export() {

    }

}