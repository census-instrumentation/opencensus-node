/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import * as http from 'http';
import * as url from 'url';

import {debug} from '@opencensus/opencensus-core';
import {RootSpan} from '@opencensus/opencensus-core';
import {Span} from '@opencensus/opencensus-core';
import {Exporter} from '@opencensus/opencensus-core';
import {Buffer} from '@opencensus/opencensus-core';
import {Config} from '@opencensus/opencensus-core';
import {Logger} from '@opencensus/opencensus-core';
import {ZipkinOptions} from './options';

/** Zipkin Exporter manager class */
export class Zipkin implements Exporter {
  private zipkinUrl: url.UrlWithStringQuery;
  private serviceName: string;
  private buffer: Buffer;
  logger: Logger;

  constructor(options: ZipkinOptions) {
    this.zipkinUrl = url.parse(options.url);
    this.serviceName = options.serviceName;
    this.buffer = new Buffer(this, options)
  }

  /**
   * Is called whenever a span is ended.
   * @param root the ended span
   */
  onEndSpan(root: RootSpan) {
    this.buffer.addToBuffer(root);
  }

  /**
   * Send a trace to zipkin service
   * @param zipkinTrace Trace translated to Zipkin Service
   */
  private sendTrace(zipkinTrace) {
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

    /** Request object */
    const req = http.request(options, (res) => {
      debug(`STATUS: ${res.statusCode}`);
      debug(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        debug(`BODY: ${chunk}`);
      });
      res.on('end', () => {
        debug('Finished request.');
      });
    });

    req.on('error', (e) => {
      debug(`problem with request: ${e.message}`);
    });

    /** Request body */
    const spansJson: string[] = zipkinTrace.map((span) => JSON.stringify(span));
    spansJson.join('');
    const outputJson = `[${spansJson}]`;
    debug('Zipkins span list Json: %s', outputJson);

    // Sendind the request
    req.write(outputJson);
    req.end();
  }

  /**
   * Translate OpenSensus RootSpan to Zipkin format
   * @param rootSpan Trace to be translated
   */
  private translateTrace(rootSpan: RootSpan) {
    const spanList = [];

    /** RootSpan data */
    const spanRoot = this.translateSpan(rootSpan);
    spanList.push(spanRoot);

    // Builds span data
    for (const span of rootSpan.spans) {
      spanList.push(this.translateSpan(span, rootSpan));
    }

    return spanList;
  }

  /**
   * translate OpenSensus Span to Zipkin format
   * @param span Span to be translated
   * @param rootSpan Only necessary if the span has rootSpan
   */
  private translateSpan(span: Span|RootSpan, rootSpan?: RootSpan) {
    const spanTraslated = {
      'traceId': span.traceId,
      'name': span.name,
      'id': span.id,
      'kind': 'SERVER',
      'timestamp': (span.startTime.getTime() * 1000).toFixed(),
      'duration': (span.duration * 1000).toFixed(),
      'debug': true,
      'shared': true,
      'localEndpoint': {'serviceName': this.serviceName}
    };

    if (rootSpan) {
      spanTraslated['parentId'] = rootSpan.id;
    }

    return spanTraslated;
  }

  /**
   * Send the rootSpans to zipkin service
   * @param rootSpans RootSpan array
   */
  publish(rootSpans: RootSpan[]) {
    rootSpans.forEach(trace => {
      this.sendTrace(this.translateTrace(trace));
    });
  }
}