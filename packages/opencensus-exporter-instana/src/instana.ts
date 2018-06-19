/**
 * Copyright 2018, OpenCensus Authors
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

import {classes, logger, types} from '@opencensus/opencensus-core';
import {request} from 'http';

type InstanaSpan = {
  spanId: string,
  parentId: string|undefined,
  traceId: string,
  timestamp: number,
  duration: number,
  name: string,
  type: string,
  error: boolean,
  data: {[s: string]: string;}
};

export interface InstanaExporterOptions extends types.ExporterConfig {
  agentHost?: string;
  agentPort?: number;
  transmissionTimeout?: number;
}

export class InstanaTraceExporter implements types.Exporter {
  agentHost: string;
  agentPort: number;
  transmissionTimeout: number;

  exporterBuffer: classes.ExporterBuffer;
  logger: types.Logger;

  constructor(options: InstanaExporterOptions = {}) {
    this.agentHost =
        options.agentHost || process.env.INSTANA_AGENT_HOST || '127.0.0.1';
    this.agentPort =
        options.agentPort || Number(process.env.INSTANA_AGENT_PORT) || 42699;
    this.transmissionTimeout = options.transmissionTimeout || 10000;
    this.logger = options.logger || logger.logger();
    this.exporterBuffer = new classes.ExporterBuffer(this, options);
  }

  onStartSpan(root: types.RootSpan) {}

  onEndSpan(root: types.RootSpan) {
    this.exporterBuffer.addToBuffer(root);
  }

  /**
   * Sends spans to Instana.
   *
   * @param rootSpans The spans to transmit to Instana
   * @returns An indicator whether publishing was successful. This method
   * purposefully does not return a rejected Promise, because the code path
   * calling the publish function does not expect a Promise to be returned. For
   * this reason, a rejection handler is never registered for these promises.
   *   For this reason returning a rejected Promise would result in a
   * UnhandledPromiseRejectionWarning.
   *
   * This Promise is meant as a problem indicator for tests only.
   */
  publish(rootSpans: types.RootSpan[]): Promise<Error> {
    try {
      return this
          .transmit(this.translateRootSpans(rootSpans))

          .catch(e => e);
    } catch (e) {
      this.logger.error(
          'Unexpected error in Instana exporter during publish attempt', e);
      return Promise.resolve(e);
    }
  }

  private translateRootSpans(rootSpans: types.RootSpan[]): InstanaSpan[] {
    const result: InstanaSpan[] = [];
    return rootSpans.reduce((agg, rootSpan) => {
      agg.push(this.translateSpan(rootSpan));
      return agg.concat(rootSpan.spans.map(this.translateSpan));
    }, result);
  }

  private translateSpan(span: types.Span): InstanaSpan {
    return {
      spanId: span.id,
      // Do not report parentId as null. Instead, drop the field.
      parentId: span.parentSpanId ? span.parentSpanId : undefined,
      traceId: span.traceId.substring(0, 8),
      timestamp: span.startTime.getTime(),
      // API requires an integer/long
      duration: span.duration | 0,
      name: span.name,
      type: span.type,
      // No translatable counterpart in OpenCensus as of 2018-06-14
      error: false,
      data: Object.keys(span.attributes)
                .reduce(
                    (agg: {[k: string]: string}, key) => {
                      agg[String(key)] = String(span.attributes[key]);
                      return agg;
                    },
                    {})
    };
  }

  private transmit(spans: InstanaSpan[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const json = JSON.stringify(spans);
      this.logger.debug(
          'Transmitting the following spans (%s) to Instana agent',
          spans.length, json);
      const payload = Buffer.from(json, 'utf8');
      const options = {
        hostname: this.agentHost,
        port: this.agentPort,
        path: '/com.instana.plugin.generic.trace',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Content-Length': payload.length
        }
      };

      const req = request(options, (res) => {
        res.setEncoding('utf8');
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          if (res.statusCode != null && 200 <= res.statusCode &&
              res.statusCode <= 299) {
            this.logger.debug(
                'Successfully delivered %s spans to Instana agent',
                spans.length);
            resolve();
          } else {
            this.logger.error(
                'Delivery of %s spans to Instana agent failed. %s %s: %s',
                spans.length, res.statusCode, res.statusMessage, responseBody);
            reject();
          }
        });
      });

      req.setTimeout(this.transmissionTimeout, () => req.abort());

      req.on('error', (e) => {
        this.logger.error(
            'Failed to deliver %s spans to Instana agent', spans.length, e);
        reject();
      });

      req.write(payload);
      req.end();
    });
  }
}
