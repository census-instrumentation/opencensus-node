import {Exporter} from '../../exporters/types';
import {PluginNames} from '../instrumentation/types';

/**
 * This interface represent the probability of a tracer.
 */
export interface Sampler {

  /**
   * Set idUpperBound with MAX_NUMBER that is equivalent the probability be 1
   * @returns a Sampler object
   */

  always(): Sampler;
  /**
   * Set idUpperBound with MIN_NUMBER that is equivalent the probability be 0
   * @returns a Sampler object
   */

  never(): Sampler;

  /**
   * Set idUpperBound with the probability. If probability
   * parameter is bigger then 1 set always. If probability parameter less
   * than 0, set never.
   * @param probability probability between 0 and 1
   * @returns a Sampler object
   */
  probability(probability: number): Sampler;

  /**
   * Checks if trace belong the sample.
   * @param traceId Used to check the probability
   * @returns a boolean. True if the traceId is in probability
   * False if the traceId is not in probability.
   */
  shouldSample(traceId: string): boolean;
}

/**
 * Interface configuration for a buffer 
 */
export interface BufferConfig {
  bufferSize?: number;
  bufferTimeout?: number
}

/** Defines tracer configuration parameters */
export interface TracerConfig {
  /** Determines the samplin rate. Ranges from 0.0 to 1.0 */
  samplingRate?: number;
  /** Determines the ignored (or blacklisted) URLs */
  ignoreUrls?: Array<string|RegExp>;
}

/** Available configuration options. */
export interface TracingConfig {
  logLevel?: number;
  maximumLabelValueSize?: number;
  plugins?: PluginNames;
  exporter?: Exporter;
}

export type Config = TracingConfig&TracerConfig&BufferConfig;


