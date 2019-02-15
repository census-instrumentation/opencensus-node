/**
 * Copyright 2018 OpenCensus Authors.
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

import * as coreTypes from '@opencensus/core';
import {Exporter, ExporterBuffer, ExporterConfig, RootSpan, Span, SpanKind} from '@opencensus/core';
import {logger, Logger} from '@opencensus/core';
import * as http from 'http';
import * as url from 'url';

const STATUS_CODE = 'census.status_code';
const STATUS_DESCRIPTION = 'census.status_description';

const messageEventTypeTranslation: {[k: number]: string} = {
  0: 'UNSPECIFIED',
  1: 'SENT',
  2: 'RECEIVED'
};

export interface ZipkinExporterOptions extends ExporterConfig {
  url?: string;
  serviceName: string;
}

interface TranslatedSpan {
  traceId: string;
  name: string;
  id: string;
  parentId?: string;
  kind: string;
  timestamp: number;
  duration: number;
  debug: boolean;
  shared: boolean;
  localEndpoint: {serviceName: string};
  annotations: Annotation[];
  tags: {[key: string]: string};
}

interface Annotation {
  timestamp?: number;
  value?: string;
}

/** Zipkin Exporter manager class */
export class ZipkinTraceExporter implements Exporter {
  static readonly DEFAULT_URL = 'http://localhost:9411/api/v2/spans';
  private zipkinUrl: url.UrlWithStringQuery;
  private serviceName: string;
  buffer: ExporterBuffer;
  logger: Logger;

  constructor(options: ZipkinExporterOptions) {
    this.zipkinUrl = options.url && url.parse(options.url) ||
        url.parse(ZipkinTraceExporter.DEFAULT_URL);
    this.serviceName = options.serviceName;
    this.buffer = new ExporterBuffer(this, options);
    this.logger = options.logger || logger.logger();
  }

  /**
   * Is called whenever a span is ended.
   * @param root the ended span
   */
  onEndSpan(root: RootSpan) {
    this.buffer.addToBuffer(root);
  }

  /** Not used for this exporter */
  onStartSpan(root: RootSpan) {}

  /**
   * Send a trace to zipkin service
   * @param zipkinTraces Trace translated to Zipkin Service
   */
  private sendTraces(zipkinTraces: TranslatedSpan[]) {
    /** Request options */
    const options = {
      hostname: this.zipkinUrl.hostname,
      port: this.zipkinUrl.port,
      path: this.zipkinUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    return new Promise((resolve, reject) => {
      /** Request object */
      const req = http.request(options, (res) => {
        res.on('data', (chunk) => {});
        // Resolve on end
        res.on('end', () => {
          resolve(
              {statusCode: res.statusCode, statusMessage: res.statusMessage});
        });
      });

      /** Request error event */
      req.on('error', (e) => {
        reject({
          statusCode: 0,
          statusMessage: `Problem with request: ${e.message}`
        });
      });

      try {
        /** Request body */
        const outputJson = JSON.stringify(zipkinTraces);
        this.logger.debug('Zipkins span list Json: %s', outputJson);
        // Sendind the request
        req.write(outputJson, 'utf8');
        req.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Mount a list (array) of spans translated to Zipkin format
   * @param rootSpans Rootspan array to be translated
   */
  private mountSpanList(rootSpans: RootSpan[]): TranslatedSpan[] {
    const spanList: TranslatedSpan[] = [];

    for (const root of rootSpans) {
      /** RootSpan data */
      spanList.push(this.translateSpan(root));

      // Builds spans data
      for (const span of root.spans) {
        spanList.push(this.translateSpan(span));
      }
    }

    return spanList;
  }

  /**
   * Translate OpenSensus Span to Zipkin format
   * @param span Span to be translated
   * @param rootSpan Only necessary if the span has rootSpan
   */
  translateSpan(span: Span|RootSpan): TranslatedSpan {
    const spanTraslated = {
      traceId: span.traceId,
      name: span.name,
      id: span.id,
      // Zipkin API for span kind only accept
      // (CLIENT|SERVER|PRODUCER|CONSUMER)
      kind: span.kind === SpanKind.CLIENT ? 'CLIENT' : 'SERVER',
      timestamp: span.startTime.getTime() * 1000,
      duration: Math.round(span.duration * 1000),
      debug: true,
      shared: true,
      localEndpoint: {serviceName: this.serviceName},
      tags: this.createTags(span.attributes, span.status),
      annotations: this.createAnnotations(span.annotations, span.messageEvents)
    } as TranslatedSpan;

    if (span.parentSpanId) {
      spanTraslated.parentId = span.parentSpanId;
    }
    return spanTraslated;
  }

  private createTags(
      attributes: coreTypes.Attributes, status: coreTypes.Status) {
    const tags: {[key: string]: string} = {};
    for (const key of Object.keys(attributes)) {
      tags[key] = String(attributes[key]);
    }
    tags[STATUS_CODE] = String(status.code);
    if (status.message) {
      tags[STATUS_DESCRIPTION] = status.message;
    }
    return tags;
  }

  private createAnnotations(
      annotationTimedEvents: coreTypes.Annotation[],
      messageEventTimedEvents: coreTypes.MessageEvent[]) {
    let annotations: Annotation[] = [];
    if (annotationTimedEvents) {
      annotations =
          annotationTimedEvents.map((annotation) => ({
                                      timestamp: annotation.timestamp * 1000,
                                      value: annotation.description
                                    }));
    }
    if (messageEventTimedEvents) {
      annotations.push(...messageEventTimedEvents.map(
          (messageEvent) => ({
            timestamp: messageEvent.timestamp * 1000,
            value: messageEventTypeTranslation[messageEvent.type]
          })));
    }
    return annotations;
  }

  // TODO: review return of method publish from exporter interface - today is
  // returning void
  /**
   * Send the rootSpans to zipkin service
   * @param rootSpans RootSpan array
   */
  publish(rootSpans: RootSpan[]) {
    const spanList = this.mountSpanList(rootSpans);

    return this.sendTraces(spanList).catch((err) => {
      return err;
    });
  }
}
