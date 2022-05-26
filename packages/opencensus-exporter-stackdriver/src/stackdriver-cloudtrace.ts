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

import {
  Exporter,
  ExporterBuffer,
  Span as OCSpan,
  SpanContext,
} from '@opencensus/core';
import { logger, Logger } from '@opencensus/core';
import { auth as globalAuth, GoogleAuth, JWT } from 'google-auth-library';
import { google, cloudtrace_v2 } from 'googleapis';
import { getDefaultResource } from './common-utils';
import {
  createAttributes,
  createLinks,
  createTimeEvents,
  getResourceLabels,
  stringToTruncatableString,
} from './stackdriver-cloudtrace-utils';
import {
  AttributeValue,
  Span,
  SpansWithCredentials,
  StackdriverExporterOptions,
} from './types';

google.options({ headers: { 'x-opencensus-outgoing-request': 0x1 } });
let auth = globalAuth;

/** Format and sends span information to Stackdriver */
export class StackdriverTraceExporter implements Exporter {
  projectId: string;
  exporterBuffer: ExporterBuffer;
  logger: Logger;
  failBuffer: SpanContext[] = [];
  private RESOURCE_LABELS: Promise<Record<string, AttributeValue>>;
  private cloudTrace: cloudtrace_v2.Cloudtrace;

  constructor(options: StackdriverExporterOptions) {
    this.projectId = options.projectId;
    this.logger = options.logger || logger.logger();
    this.exporterBuffer = new ExporterBuffer(this, options);
    this.RESOURCE_LABELS = getResourceLabels(
      getDefaultResource(this.projectId)
    );
    if (options.credentials) {
      auth = new GoogleAuth({
        credentials: options.credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    }
    this.cloudTrace = google.cloudtrace({
      version: 'v2',
      rootUrl:
        'https://' + (options.apiEndpoint || 'cloudtrace.googleapis.com'),
    });
  }

  /**
   * Is called whenever a span is ended.
   * @param span the ended span
   */
  onEndSpan(span: OCSpan) {
    // Add spans of a trace together when root is ended, skip non root spans.
    // translateSpan function will extract child spans from root.
    if (!span.isRootSpan()) return;
    this.exporterBuffer.addToBuffer(span);
  }

  /** Not used for this exporter */
  onStartSpan(span: OCSpan) {}

  /**
   * Publishes a list of spans to Stackdriver.
   * @param spans The list of spans to transmit to Stackdriver
   */
  async publish(spans: OCSpan[]) {
    const spanList = await this.translateSpan(spans);

    return this.authorize(spanList)
      .then((spans: SpansWithCredentials) => {
        return this.batchWriteSpans(spans);
      })
      .catch(err => {
        for (const span of spans) {
          this.failBuffer.push(span.spanContext);
        }
        return err;
      });
  }

  async translateSpan(spans: OCSpan[]) {
    const resourceLabel = await this.RESOURCE_LABELS;
    const spanList: Span[] = [];
    spans.forEach(span => {
      // RootSpan data
      spanList.push(
        this.createSpan(span, resourceLabel, span.numberOfChildren)
      );
      span.spans.forEach(child => {
        // Builds spans data
        spanList.push(this.createSpan(child, resourceLabel));
      });
    });
    return spanList;
  }

  private createSpan(
    span: OCSpan,
    resourceLabels: Record<string, AttributeValue>,
    numberOfChildren = 0
  ): Span {
    const spanName = `projects/${this.projectId}/traces/${span.traceId}/spans/${span.id}`;

    const spanBuilder: Span = {
      name: spanName,
      spanId: span.id,
      displayName: stringToTruncatableString(span.name),
      startTime: span.startTime.toISOString(),
      endTime: span.endTime.toISOString(),
      attributes: createAttributes(
        span.attributes,
        resourceLabels,
        span.droppedAttributesCount
      ),
      timeEvents: createTimeEvents(
        span.annotations,
        span.messageEvents,
        span.droppedAnnotationsCount,
        span.droppedMessageEventsCount
      ),
      links: createLinks(span.links, span.droppedLinksCount),
      status: { code: span.status.code },
      sameProcessAsParentSpan: !span.remoteParent,
      childSpanCount: numberOfChildren,
      stackTrace: undefined, // Unsupported by nodejs
    };
    if (span.parentSpanId) {
      spanBuilder.parentSpanId = span.parentSpanId;
    }
    if (span.status.message && spanBuilder.status) {
      spanBuilder.status.message = span.status.message;
    }

    return spanBuilder;
  }

  /**
   * Sends new spans to new or existing traces in the Stackdriver format to the
   * service.
   * @param spans
   */
  private batchWriteSpans(spans: SpansWithCredentials): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      // TODO: Consider to use gRPC call (BatchWriteSpansRequest) for sending
      // data to backend :
      // https://cloud.google.com/trace/docs/reference/v2/rpc/google.devtools.
      // cloudtrace.v2#google.devtools.cloudtrace.v2.TraceService
      this.cloudTrace.projects.traces.batchWrite(spans, (err: Error | null) => {
        if (err) {
          err.message = `batchWriteSpans error: ${err.message}`;
          this.logger.error(err.message);
          reject(err);
        } else {
          const successMsg = 'batchWriteSpans successfully';
          this.logger.debug(successMsg);
          resolve(successMsg);
        }
      });
    });
  }

  /**
   * Gets the Google Application Credentials from the environment variables,
   * authenticates the client and calls a method to send the spans data.
   * @param stackdriverSpans The spans to export
   */
  private async authorize(
    stackdriverSpans: Span[]
  ): Promise<SpansWithCredentials> {
    try {
      const client = await auth.getClient();

      return {
        name: `projects/${this.projectId}`,
        resource: { spans: stackdriverSpans },
        auth: client as JWT,
      };
    } catch (err) {
      err.message = `authorize error: ${err.message}`;
      this.logger.error(err.message);
      throw err;
    }
  }
}
