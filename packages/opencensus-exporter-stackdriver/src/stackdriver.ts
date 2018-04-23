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
import {JWT} from 'google-auth-library';
import {google} from 'googleapis';

import {StackdriverOptions} from './options';

google.options({headers: {'x-opencensus-outgoing-request': 0x1}});
const cloudTrace = google.cloudtrace('v1');

type ExporterBuffer = typeof classes.ExporterBuffer;

/** Format and sends span information to Stackdriver */
export class Stackdriver implements types.Exporter {
  projectId: string;
  exporterBuffer: classes.ExporterBuffer;
  logger: types.Logger;

  constructor(options: StackdriverOptions) {
    this.projectId = options.projectId;
    this.logger = options.logger || logger.logger('debug');
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
  async publish(rootSpans: types.RootSpan[]) {
    const stackdriverTraces =
        rootSpans.map(trace => this.translateTrace(trace));
    return this.authorize(this.sendTrace, stackdriverTraces);
  }

  /**
   * Translates root span data to Stackdriver's trace format.
   * @param root
   */
  private translateTrace(root: types.RootSpan) {
    const spanList = root.spans.map(span => this.translateSpan(span));
    spanList.push(this.translateSpan(root));

    return {
      'projectId': this.projectId,
      'traceId': root.traceId,
      'spans': spanList
    };
  }

  /**
   * Translates span data to Stackdriver's span format.
   * @param span
   */
  private translateSpan(span: types.Span) {
    return {
      'name': span.name,
      'kind': 'SPAN_KIND_UNSPECIFIED',
      'spanId': span.id,
      'startTime': span.startTime,
      'endTime': span.endTime
    };
  }

  /**
   * Sends traces in the Stackdriver format to the service.
   * @param projectId
   * @param authClient
   * @param stackdriverTraces
   */
  private async sendTrace(
      projectId: string, authClient: JWT, stackdriverTraces) {
    const request = {
      projectId,
      resource: {traces: stackdriverTraces},
      auth: authClient
    };
    return new Promise((resolve, reject) => {
      cloudTrace.projects.patchTraces(request, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve('Sent traces sucessfully');
        }
      });
    });
  }

  /**
   * Gets the Google Application Credentials from the environment variables,
   * authenticates the client and calls a method to send the traces data.
   * @param sendTrace
   * @param stackdriverTraces
   */
  private async authorize(sendTrace: Function, stackdriverTraces) {
    const logger = this.logger;
    return new Promise((resolve, reject) => {
      google.auth.getApplicationDefault(
          (err, authClient: JWT, projectId: string) => {
            if (err) {
              logger.error('authentication failed: ', err);
              reject(err);
              return;
            }
            if (authClient.createScopedRequired &&
                authClient.createScopedRequired()) {
              const scopes = ['https://www.googleapis.com/auth/cloud-platform'];
              authClient = authClient.createScoped(scopes);
            }

            sendTrace(projectId, authClient, stackdriverTraces)
                .then((result) => {
                  resolve(result);
                })
                .catch((err) => {
                  reject(err);
                });
          });
    });
  }
}