import { Clock } from '../../internal/clock';
import { debug, randomSpanId } from '../../internal/util';
import { Sampler } from '../config/sampler';
import { TraceContext, Span } from '../types';

export interface MapLabels { [propName: string]: string; }
export interface MapObjects { [propName: string]: any; }

export abstract class SpanBaseModel implements Span {
    protected className: string;
    /** The clock used to mesure the beginning and ending of a span */
    private clock: Clock = null;
    /** Indicates if this span was started */
    private startedLocal = false;
    /** Indicates if this span was ended */
    private endedLocal = false;
    /** A set of attributes, each in the format [KEY]:[VALUE] */
    private attributes: MapLabels = {};
    /** A set of attributes on the annotation describing an event */
    private annotations: MapObjects = {};
    /** Indicates if this span was forced to end */
    private truncated = false;
    /** The Span ID of this span */
    readonly id: string;
    remoteParent: string;
    /** The span ID of this span's parent. If it's a root span, must be empty */
    parentSpanId = '';
    /** The resource name of the span */
    name: string = null;
    /** Type of span. Used to specify additional relationships between spans */
    type: string = null;
    /** A final status for this span */
    status: number;
    /** A sampler that will decide if the span will be sampled or not */
    sampler: Sampler;
  
    /** Constructs a new SpanBaseModel instance. */
    constructor() {
      this.className = this.constructor.name;
      this.id = randomSpanId();
    }
  
    abstract get traceId(): string;
  
    /** Indicates if span was started. */
    get started(): boolean {
      return this.startedLocal;
    }
  
    /** Indicates if span was ended. */
    get ended(): boolean {
      return this.endedLocal;
    }
  
    /**
     * Gives a timestap that indicates the span's start time in RFC3339 UTC
     * "Zulu" format.
     */
    get startTime(): Date {
      if (this.clock) return this.clock.startTime;
    }
  
    /**
     * Gives a timestap that indicates the span's end time in RFC3339 UTC
     * "Zulu" format.
     */
    get endTime(): Date {
      if (this.clock) return this.clock.endTime;
    }
  
    /**
     * Gives a timestap that indicates the span's duration in RFC3339 UTC
     * "Zulu" format.
     */
    get duration(): number {
      if (this.clock) return this.clock.duration;
    }
  
    /** Gives the TraceContext of the span. */
    get traceContext(): TraceContext {
      return {
        traceId: this.traceId.toString(),
        spanId: this.id.toString(),
        parentSpanId: this.parentSpanId
      } as TraceContext;
    }
  
    /**
     * Adds an atribute to the span.
     * @param key Describes the value added.
     * @param value The result of an operation.
     */
    addAtribute(key: string, value: string) {
      // TODO: maybe key and values must be truncate
      this.attributes[key] = value;
    }
  
    /**
     * Adds an annotation to the span.
     * @param key Describes the value added.
     * @param value The result of an operation.
     */
    addAnotation(key: string, value: string|number|boolean) {
      // TODO: maybe keys and values must be truncate
      this.annotations[key] = value;
    }
  
    /** Starts a span. */
    start() {
      if (this.started) {
        debug(
            'calling %s.start() on already started %s %o', this.className,
            this.className, {id: this.id, name: this.name, type: this.type});
        return;
      }
      this.clock = new Clock();
      this.startedLocal = true;
    }
  
    /** Ends a span. */
    end(): void {
      if (!this.started) {
        debug(
            'calling %s.end() on un-started %s %o', this.className,
            this.className, {id: this.id, name: this.name, type: this.type});
        return;
      }
      if (this.ended) {
        debug(
            'calling %s.end() on already ended %s %o', this.className,
            this.className, {id: this.id, name: this.name, type: this.type});
        return;
      }
      this.startedLocal = false;
      this.endedLocal = true;
      this.clock.end();
    }
  
  
    /** Forces to end a span. */
    truncate() {
      // TODO: review
      if (!this.started) {
        debug(
            'calling truncate non-started %s - ignoring %o', this.className,
            {id: this.id, name: this.name, type: this.type});
        return;
      } else if (this.ended) {
        debug(
            'calling truncate already ended %s - ignoring %o', this.className,
            {id: this.id, name: this.name, type: this.type});
        return;
      }
      this.truncated = true;
      this.end();
      debug('truncating %s  %o', this.className, {id: this.id, name: this.name});
    }
}