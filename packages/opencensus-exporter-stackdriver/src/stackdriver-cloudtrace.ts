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

import {Exporter, ExporterBuffer, ExporterConfig, RootSpan, Span, SpanContext} from '@opencensus/core';
import {logger, Logger} from '@opencensus/core';
import {auth, JWT} from 'google-auth-library';
import {google} from 'googleapis';

import {StackdriverExporterOptions, TracesWithCredentials, TranslatedSpan, TranslatedTrace} from './types';

google.options({headers: {'x-opencensus-outgoing-request': 0x1}});
const cloudTrace = google.cloudtrace('v1');

/** Format and sends span information to Stackdriver */
export class StackdriverTraceExporter implements Exporter {
  projectId: string;
  exporterBuffer: ExporterBuffer;
  logger: Logger;
  failBuffer: SpanContext[] = [];

  constructor(options: StackdriverExporterOptions) {
    this.projectId = options.projectId;
    this.logger = options.logger || logger.logger();
    this.exporterBuffer = new ExporterBuffer(this, options);
  }

  /**
   * Is called whenever a span is ended.
   * @param root the ended span
   */
  onEndSpan(root: RootSpan) {
    this.exporterBuffer.addToBuffer(root);
  }

  /** Not used for this exporter */
  onStartSpan(root: RootSpan) {}

  /**
   * Publishes a list of root spans to Stackdriver.
   * @param rootSpans
   */
  publish(rootSpans: RootSpan[]) {
    const stackdriverTraces =
        rootSpans.map(trace => this.translateTrace(trace));

    return this.authorize(stackdriverTraces)
        .then((traces: TracesWithCredentials) => {
          return this.sendTrace(traces);
        })
        .catch(err => {
          for (const root of rootSpans) {
            this.failBuffer.push(root.spanContext);
          }
          return err;
        });
  }

  /**
   * Translates root span data to Stackdriver's trace format.
   * @param root
   */
  private translateTrace(root: RootSpan): TranslatedTrace {
    const spanList = root.spans.map((span: Span) => this.translateSpan(span));
    spanList.push(this.translateSpan(root));

    return {projectId: this.projectId, traceId: root.traceId, spans: spanList};
  }

  /**
   * Translates span data to Stackdriver's span format.
   * @param span
   */
  private translateSpan(span: Span): TranslatedSpan {
    return {
      name: span.name,
      kind: 'SPAN_KIND_UNSPECIFIED',
      spanId: span.id,
      startTime: span.startTime,
      endTime: span.endTime,
      labels: Object.keys(span.attributes)
                  .reduce(
                      (acc, k) => {
                        acc[k] = String(span.attributes[k]);
                        return acc;
                      },
                      {} as Record<string, string>)
    };
  }

  /**
   * Sends traces in the Stackdriver format to the service.
   * @param traces
   */
  private sendTrace(traces: TracesWithCredentials) {
    return new Promise((resolve, reject) => {
      cloudTrace.projects.patchTraces(traces, (err: Error) => {
        if (err) {
          err.message = `sendTrace error: ${err.message}`;
          this.logger.error(err.message);
          reject(err);
        } else {
          const successMsg = 'sendTrace sucessfully';
          this.logger.debug(successMsg);
          resolve(successMsg);
        }
      });
    });
  }

  /**
   * Gets the Google Application Credentials from the environment variables,
   * authenticates the client and calls a method to send the traces data.
   * @param stackdriverTraces
   */
  private authorize(stackdriverTraces: TranslatedTrace[]) {
    return auth.getApplicationDefault()
        .then((client) => {
          let authClient = client.credential as JWT;

          if (authClient.createScopedRequired &&
              authClient.createScopedRequired()) {
            const scopes = ['https://www.googleapis.com/auth/cloud-platform'];
            authClient = authClient.createScoped(scopes);
          }

          const traces: TracesWithCredentials = {
            projectId: client.projectId,
            resource: {traces: stackdriverTraces},
            auth: authClient
          };
          return traces;
        })
        .catch((err) => {
          err.message = `authorize error: ${err.message}`;
          this.logger.error(err.message);
          throw (err);
        });
  }
}