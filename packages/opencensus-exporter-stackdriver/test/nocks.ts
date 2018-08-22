/**
 * Copyright 2016 Google Inc. All Rights Reserved.
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

import * as nock from 'nock';

// Original file from Stackdriver Trace Agent for Node.js
// https://github.com/GoogleCloudPlatform/cloud-trace-nodejs/blob/master/test/nocks.ts

const accept = () => true;

export function oauth2<T extends {} = {}>(validator?: (body: T) => boolean):
    nock.Scope {
  validator = validator || accept;
  return nock(/https:\/\/(accounts\.google\.com|www\.googleapis\.com)/)
      .persist()
      .post(/\/oauth2.*token/, validator)
      .reply(200, {
        refresh_token: 'hello',
        access_token: 'goodbye',
        expiry_date: new Date(9999, 1, 1)
      });
}

export function projectId(status: number|(() => string), reply?: () => string) {
  if (typeof status === 'function') {
    reply = status;
    status = 200;
  }
  return nock('http://metadata.google.internal')
      .get('/computeMetadata/v1/project/project-id')
      .once()
      .reply(status, reply, {'Metadata-Flavor': 'Google'});
}

export function instanceId(
    status: number|(() => string), reply?: () => string) {
  if (typeof status === 'function') {
    reply = status;
    status = 200;
  }
  return nock('http://metadata.google.internal')
      .get('/computeMetadata/v1/instance/id')
      .once()
      .reply(status, reply, {'Metadata-Flavor': 'Google'});
}

export function hostname(status: number|(() => string), reply?: () => string) {
  if (typeof status === 'function') {
    reply = status;
    status = 200;
  }
  return nock('http://metadata.google.internal')
      .get('/computeMetadata/v1/instance/hostname')
      .once()
      .reply(status, reply, {'Metadata-Flavor': 'Google'});
}

export function patchTraces<T extends {} = {}>(
    project: string, validator?: (body: T) => boolean, reply?: () => string,
    withError?: boolean) {
  validator = validator || accept;
  const interceptor =
      nock('https://cloudtrace.googleapis.com')
          .patch('/v1/projects/' + project + '/traces', validator);
  let scope: nock.Scope;
  if (withError) {
    scope = interceptor.replyWithError(reply);
  } else if (reply) {
    scope = interceptor.reply(reply);
  } else {
    scope = interceptor.reply(200);
  }
  return scope;
}

export function timeSeries<T extends {} = {}>(
    project: string, validator?: (body: T) => boolean, reply?: () => string,
    withError?: boolean) {
  validator = validator || accept;
  const interceptor =
      nock('https://monitoring.googleapis.com')
          .post('/v3/projects/' + project + '/timeSeries', validator);
  let scope: nock.Scope;
  if (withError) {
    scope = interceptor.replyWithError(reply);
  } else if (reply) {
    scope = interceptor.reply(reply);
  } else {
    scope = interceptor.reply(200, reply);
  }
  return scope;
}

export function metricDescriptors<T extends {} = {}>(
    project: string, validator?: (body: T) => boolean, reply?: () => string,
    withError?: boolean) {
  validator = validator || accept;
  const interceptor =
      nock('https://monitoring.googleapis.com')
          .post('/v3/projects/' + project + '/metricDescriptors', validator);
  let scope: nock.Scope;
  if (withError) {
    scope = interceptor.replyWithError(reply);
  } else {
    scope = interceptor.reply(200, reply);
  }
  return scope;
}