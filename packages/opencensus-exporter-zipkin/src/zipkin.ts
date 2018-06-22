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

import {Exporter, ExporterBuffer, ExporterConfig, RootSpan, Span} from '@opencensus/core';
import {logger, Logger} from '@opencensus/core';
import {prototype} from 'events';
import * as http from 'http';
import * as url from 'url';

export interface ZipkinExporterOptions extends ExporterConfig {
  url: string;
  serviceName: string;
}

interface TranslatedSpan {
  traceId: string;
  name: string;
  id: string;
  parentId?: string;
  kind: string;
  timestamp: string;
  duration: string;
  debug: boolean;
  shared: boolean;
  localEndpoint: {serviceName: string};
}

/** Zipkin Exporter manager class */
export class ZipkinTraceExporter implements Exporter {
  private zipkinUrl: url.UrlWithStringQuery;
  private serviceName: string;
  buffer: ExporterBuffer;
  logger: Logger;

  constructor(options: ZipkinExporterOptions) {
    this.zipkinUrl = url.parse(options.url);
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
  private translateSpan(span: Span|RootSpan): TranslatedSpan {
    const spanTraslated = {
      traceId: span.traceId,
      name: span.name,
      id: span.id,
      parentId: span.parentSpanId,
      kind: 'SERVER',
      timestamp: (span.startTime.getTime() * 1000).toFixed(),
      duration: (span.duration * 1000).toFixed(),
      debug: true,
      shared: true,
      localEndpoint: {serviceName: this.serviceName}
    } as TranslatedSpan;

    return spanTraslated;
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
