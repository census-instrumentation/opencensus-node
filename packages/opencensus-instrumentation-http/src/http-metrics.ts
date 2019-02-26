/**
 * Copyright 2019, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License'};
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      gRPC://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {AggregationType, globalStats, MeasureUnit, Stats, View} from '@opencensus/core';

/**
 * {@link Measure} for the client-side total bytes sent in request body (not
 * including headers). This is uncompressed bytes.
 */
export const HTTP_CLIENT_SENT_BYTES = globalStats.createMeasureInt64(
    'opencensus.io/http/client/sent_bytes', MeasureUnit.BYTE,
    'Client-side total bytes sent in request body (uncompressed)');

/**
 * {@link Measure} for the client-side total bytes received in response
 * bodies (not including headers but including error responses with bodies).
 * Should be measured from actual bytes received and read, not the value of
 * the Content-Length header. This is uncompressed bytes. Responses with no
 * body should record 0 for this value.
 */
export const HTTP_CLIENT_RECEIVED_BYTES = globalStats.createMeasureInt64(
    'opencensus.io/http/client/received_bytes', MeasureUnit.BYTE,
    'Client-side total bytes received in response bodies (uncompressed)');

/**
 * {@link Measure} for the client-side time between first byte of request
 * headers sent to last byte of response received, or terminal error.
 */
export const HTTP_CLIENT_ROUNDTRIP_LATENCY = globalStats.createMeasureDouble(
    'opencensus.io/http/client/roundtrip_latency', MeasureUnit.MS,
    'Client-side time between first byte of request headers sent to last byte of response received, or terminal error');

/**
 * {@link Measure} for the server-side total bytes received in request body
 * (not including headers). This is uncompressed bytes.
 */
export const HTTP_SERVER_RECEIVED_BYTES = globalStats.createMeasureInt64(
    'opencensus.io/http/server/received_bytes', MeasureUnit.BYTE,
    'Server-side total bytes received in request body (uncompressed)');

/**
 * {@link Measure} for the server-side total bytes sent in response bodies
 * (not including headers but including error responses with bodies). Should
 * be measured from actual bytes written and sent, not the value of the
 * Content-Length header. This is uncompressed bytes. Responses with no
 * body should record 0 for this value.
 */
export const HTTP_SERVER_SENT_BYTES = globalStats.createMeasureInt64(
    'opencensus.io/http/server/sent_bytes', MeasureUnit.BYTE,
    'Server-side total bytes sent in response bodies (uncompressed)');

/**
 * {@link Measure} for the server-side time between first byte of request
 * headers received to last byte of response sent, or terminal error.
 */
export const HTTP_SERVER_LATENCY = globalStats.createMeasureDouble(
    'opencensus.io/http/server/server_latency', MeasureUnit.MS,
    'Server-side time between first byte of request headers received to last byte of response sent, or terminal error');

/** {@link TagKey} for the value of the client-side HTTP host header. */
export const HTTP_CLIENT_HOST = {
  name: 'http_client_host'
};

/** {@link TagKey} for the value of the server-side HTTP host header. */
export const HTTP_SERVER_HOST = {
  name: 'http_server_host'
};

/**
 * {@link TagKey} for the numeric client-side HTTP response status code (e.g.
 * 200, 404, 500). If a transport error occurred and no status code was read,
 * use "error" as the {@code TagValue}.
 */
export const HTTP_CLIENT_STATUS = {
  name: 'http_client_status'
};

/**
 * {@link TagKey} for the numeric server-side HTTP response status code (e.g.
 * 200, 404, 500). If a transport error occurred and no status code was written
 * use "error" as the {@code TagValue}.
 */
export const HTTP_SERVER_STATUS = {
  name: 'http_server_status'
};

/**
 * {@link TagKey} for the client-side URL path (not including query string) in
 * the request.
 */
export const HTTP_CLIENT_PATH = {
  name: 'http_client_path'
};

/**
 * {@link TagKey} for the server-side URL path (not including query string) in
 * the request.
 */
export const HTTP_SERVER_PATH = {
  name: 'http_server_path'
};

/**
 * {@link TagKey} for the client-side HTTP method of the request, capitalized
 * (GET, POST, etc.).
 */
export const HTTP_CLIENT_METHOD = {
  name: 'http_client_method'
};

/**
 * {@link TagKey} for the server-side HTTP method of the request, capitalized
 * (GET, POST, etc.).
 */
export const HTTP_SERVER_METHOD = {
  name: 'http_server_method'
};

/**
 * {@link TagKey} for the server-side logical route, a pattern that matched the
 * URL, of a handler that processed the request.
 */
export const HTTP_SERVER_ROUTE = {
  name: 'http_server_route'
};

const SIZE_DISTRIBUTION: number[] = [
  0, 1024, 2048, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216,
  67108864, 268435456, 1073741824, 4294967296
];

const LATENCY_DISTRIBUTION: number[] = [
  0,   1,   2,   3,   4,    5,    6,    8,     10,    13,    16,    20,
  25,  30,  40,  50,  65,   80,   100,  130,   160,   200,   250,   300,
  400, 500, 650, 800, 1000, 2000, 5000, 10000, 20000, 50000, 100000
];

/** {@link View} for count of client-side HTTP requests completed. */
const HTTP_CLIENT_COMPLETED_COUNT_VIEW = globalStats.createView(
    'opencensus.io/http/client/completed_count', HTTP_CLIENT_ROUNDTRIP_LATENCY,
    AggregationType.COUNT, [HTTP_CLIENT_METHOD, HTTP_CLIENT_STATUS],
    'Count of client-side HTTP requests completed');

/** {@link View} for size distribution of client-side HTTP request body. */
const HTTP_CLIENT_SENT_BYTES_VIEW = globalStats.createView(
    'opencensus.io/http/client/sent_bytes', HTTP_CLIENT_SENT_BYTES,
    AggregationType.DISTRIBUTION, [HTTP_CLIENT_METHOD, HTTP_CLIENT_STATUS],
    'Size distribution of client-side HTTP request body', SIZE_DISTRIBUTION);

/** {@link View} for size distribution of client-side HTTP response body. */
const HTTP_CLIENT_RECEIVED_BYTES_VIEW = globalStats.createView(
    'opencensus.io/http/client/received_bytes', HTTP_CLIENT_RECEIVED_BYTES,
    AggregationType.DISTRIBUTION, [HTTP_CLIENT_METHOD, HTTP_CLIENT_STATUS],
    'Size distribution of client-side HTTP response body', SIZE_DISTRIBUTION);

/**
 * {@link View} for roundtrip latency distribution of client-side HTTP requests.
 */
const HTTP_CLIENT_ROUNDTRIP_LATENCY_VIEW = globalStats.createView(
    'opencensus.io/http/client/roundtrip_latency',
    HTTP_CLIENT_ROUNDTRIP_LATENCY, AggregationType.DISTRIBUTION,
    [HTTP_CLIENT_METHOD, HTTP_CLIENT_STATUS],
    'Roundtrip latency distribution of client-side HTTP requests',
    LATENCY_DISTRIBUTION);

/** {@link View} for count of server-side HTTP requests serving completed. */
const HTTP_SERVER_COMPLETED_COUNT_VIEW = globalStats.createView(
    'opencensus.io/http/server/completed_count', HTTP_SERVER_LATENCY,
    AggregationType.COUNT,
    [HTTP_SERVER_METHOD, HTTP_SERVER_ROUTE, HTTP_SERVER_STATUS],
    'Count of HTTP server-side requests serving completed');

/** {@link View} for size distribution of server-side HTTP request body. */
const HTTP_SERVER_RECEIVED_BYTES_VIEW = globalStats.createView(
    'opencensus.io/http/server/received_bytes', HTTP_SERVER_RECEIVED_BYTES,
    AggregationType.DISTRIBUTION,
    [HTTP_SERVER_METHOD, HTTP_SERVER_ROUTE, HTTP_SERVER_STATUS],
    'Size distribution of server-side HTTP request body', SIZE_DISTRIBUTION);

/** {@link View} for size distribution of server-side HTTP response body. */
const HTTP_SERVER_SENT_BYTES_VIEW = globalStats.createView(
    'opencensus.io/http/server/sent_bytes', HTTP_SERVER_SENT_BYTES,
    AggregationType.DISTRIBUTION,
    [HTTP_SERVER_METHOD, HTTP_SERVER_ROUTE, HTTP_SERVER_STATUS],
    'Size distribution of server-side HTTP response body', SIZE_DISTRIBUTION);

/**
 * {@link View} for latency distribution of server-side HTTP requests serving.
 */
const HTTP_SERVER_LATENCY_VIEW = globalStats.createView(
    'opencensus.io/http/server/server_latency', HTTP_SERVER_LATENCY,
    AggregationType.DISTRIBUTION,
    [HTTP_SERVER_METHOD, HTTP_SERVER_ROUTE, HTTP_SERVER_STATUS],
    'Latency distribution of server-side HTTP requests serving',
    LATENCY_DISTRIBUTION);

const HTTP_BASIC_SERVER_VIEWS: View[] = [
  HTTP_SERVER_COMPLETED_COUNT_VIEW, HTTP_SERVER_RECEIVED_BYTES_VIEW,
  HTTP_SERVER_SENT_BYTES_VIEW, HTTP_SERVER_LATENCY_VIEW
];

const HTTP_BASIC_CLIENT_VIEWS: View[] = [
  HTTP_CLIENT_COMPLETED_COUNT_VIEW, HTTP_CLIENT_SENT_BYTES_VIEW,
  HTTP_CLIENT_RECEIVED_BYTES_VIEW, HTTP_CLIENT_ROUNDTRIP_LATENCY_VIEW
];

/** Register all default views. */
export function registerAllViews(globalStats: Stats) {
  registerAllClientViews(globalStats);
  registerAllServerViews(globalStats);
}

/** Register all default client views. */
export function registerAllClientViews(globalStats: Stats) {
  for (const CLIENT_VIEW of HTTP_BASIC_CLIENT_VIEWS) {
    globalStats.registerView(CLIENT_VIEW);
  }
}

/** Register all default server views. */
export function registerAllServerViews(globalStats: Stats) {
  for (const SERVER_VIEW of HTTP_BASIC_SERVER_VIEWS) {
    globalStats.registerView(SERVER_VIEW);
  }
}
