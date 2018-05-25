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
import {auth, JWT} from 'google-auth-library';
import {google} from 'googleapis';

google.options({headers: {'x-opencensus-outgoing-request': 0x1}});
const cloudTrace = google.cloudtrace('v1');

type ExporterBuffer = typeof classes.ExporterBuffer;

/**
 * Options for stackdriver configuration
 */
export interface StackdriverExporterOptions extends types.ExporterConfig {
  /**
   * projectId project id defined to stackdriver
   */
  projectId: string;
}

interface TracesWithCredentials {
  projectId: string;
  resource: {traces: {}};
  auth: JWT;
}

/** Format and sends span information to Stackdriver */
export class StackdriverTraceExporter implements types.Exporter {
  projectId: string;
  exporterBuffer: classes.ExporterBuffer;
  logger: types.Logger;
  failBuffer: types.SpanContext[] = [];

  constructor(options: StackdriverExporterOptions) {
    this.projectId = options.projectId;
    this.logger = options.logger || logger.logger();
    this.exporterBuffer = new classes.ExporterBuffer(this, options);
  }

  /**
   * Is called whenever a span is ended.
   * @param root the ended span
   */
  onEndSpan(root: types.RootSpan) {
    this.exporterBuffer.addToBuffer(root);
  }

  /**
   * Publishes a list of root spans to Stackdriver.
   * @param rootSpans
   */
  publish(rootSpans: types.RootSpan[]) {
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
          return `${err}`;
        });
  }

  /**
   * Translates root span data to Stackdriver's trace format.
   * @param root
   */
  private translateTrace(root: types.RootSpan) {
    const spanList = root.spans.map(span => this.translateSpan(span));
    spanList.push(this.translateSpan(root));

    return {projectId: this.projectId, traceId: root.traceId, spans: spanList};
  }

  /**
   * Translates span data to Stackdriver's span format.
   * @param span
   */
  private translateSpan(span: types.Span) {
    return {
      name: span.name,
      kind: 'SPAN_KIND_UNSPECIFIED',
      spanId: span.id,
      startTime: span.startTime,
      endTime: span.endTime
    };
  }

  /**
   * Sends traces in the Stackdriver format to the service.
   * @param traces
   */
  private sendTrace(traces: TracesWithCredentials) {
    return new Promise((resolve, reject) => {
      cloudTrace.projects.patchTraces(traces, err => {
        if (err) {
          const errorMsg = `sendTrace error: ${err.message}`;
          this.logger.error(errorMsg);
          reject(errorMsg);
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
  private authorize(stackdriverTraces) {
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