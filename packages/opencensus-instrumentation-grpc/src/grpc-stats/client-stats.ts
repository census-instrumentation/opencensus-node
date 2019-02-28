/**
 * Copyright 2019, OpenCensus Authors
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

import {AggregationType, globalStats, Measure, MeasureUnit, View} from '@opencensus/core';

import {DEFAULT_BYTES_DISTRIBUTION, DEFAULT_MESSAGE_COUNT_DISTRIBUTION, DEFAULT_MILLI_SECONDS_DISTRIBUTION} from './common-distributions';

/** {@link Measure} for number of messages sent in the RPC. */
export const GRPC_CLIENT_SENT_MESSAGES_PER_RPC: Measure =
    globalStats.createMeasureInt64(
        'grpc.io/client/sent_messages_per_rpc', MeasureUnit.UNIT,
        'Number of messages sent in the RPC (always 1 for non-streaming RPCs).');

/**
 * {@link Measure} for total bytes sent across all request messages per RPC.
 */
export const GRPC_CLIENT_SENT_BYTES_PER_RPC: Measure =
    globalStats.createMeasureInt64(
        'grpc.io/client/sent_bytes_per_rpc', MeasureUnit.BYTE,
        'Total bytes sent across all request messages per RPC.');

/** {@link Measure} for number of response messages received per RPC. */
export const GRPC_CLIENT_RECEIVED_MESSAGES_PER_RPC: Measure =
    globalStats.createMeasureInt64(
        'grpc.io/client/received_messages_per_rpc', MeasureUnit.UNIT,
        'Number of response messages received per RPC (always 1 for non-streaming RPCs).');

/**
 * {@link Measure} for total bytes received across all response messages per RPC
 */
export const GRPC_CLIENT_RECEIVED_BYTES_PER_RPC: Measure =
    globalStats.createMeasureInt64(
        'grpc.io/client/received_bytes_per_rpc', MeasureUnit.BYTE,
        'Total bytes received across all response messages per RPC.');

/** {@link Measure} for gRPC client roundtrip latency in milliseconds. */
export const GRPC_CLIENT_ROUNDTRIP_LATENCY: Measure = globalStats.createMeasureDouble(
    'grpc.io/client/roundtrip_latency', MeasureUnit.MS,
    'Time between first byte of request sent to last byte of response received, or terminal error.');

/** {@link Measure} for gRPC server latency in milliseconds. */
export const GRPC_CLIENT_SERVER_LATENCY: Measure = globalStats.createMeasureDouble(
    'grpc.io/client/server_latency', MeasureUnit.MS,
    'Propagated from the server and should have the same value as "grpc.io/server/latency');

/**
 * Tag key that represents a client gRPC method.
 *
 * {@link #GRPC_CLIENT_METHOD} is set when an outgoing request starts and is
 * available in all the recorded metrics.
 */
export const GRPC_CLIENT_METHOD = {
  name: 'grpc_client_method'
};

/**
 * Tag key that represents a client gRPC canonical status. Refer to
 * https://github.com/grpc/grpc/blob/master/doc/statuscodes.md.
 *
 * <p>{@link #GRPC_CLIENT_STATUS} is set when an outgoing request finishes and
 * is only available around metrics recorded at the end of the outgoing request.
 */
export const GRPC_CLIENT_STATUS = {
  name: 'grpc_client_status'
};

/** {@link View} for client received messages per RPC. */
const GRPC_CLIENT_RECEIVED_MESSAGES_PER_RPC_VIEW = globalStats.createView(
    'grpc.io/client/received_messages_per_rpc',
    GRPC_CLIENT_RECEIVED_MESSAGES_PER_RPC, AggregationType.DISTRIBUTION,
    [GRPC_CLIENT_METHOD],
    'Distribution of received messages count per RPC, by method.',
    DEFAULT_MESSAGE_COUNT_DISTRIBUTION);

/** {@link View} for client received bytes per RPC. */
const GRPC_CLIENT_RECEIVED_BYTES_PER_RPC_VIEW = globalStats.createView(
    'grpc.io/client/received_bytes_per_rpc', GRPC_CLIENT_RECEIVED_BYTES_PER_RPC,
    AggregationType.DISTRIBUTION, [GRPC_CLIENT_METHOD],
    'Distribution of bytes received per RPC, by method.',
    DEFAULT_BYTES_DISTRIBUTION);

/** {@link View} for client sent messages per RPC. */
const GRPC_CLIENT_SENT_MESSAGES_PER_RPC_VIEW = globalStats.createView(
    'grpc.io/client/sent_messages_per_rpc', GRPC_CLIENT_SENT_MESSAGES_PER_RPC,
    AggregationType.DISTRIBUTION, [GRPC_CLIENT_METHOD],
    'Distribution of sent messages count per RPC, by method.',
    DEFAULT_MESSAGE_COUNT_DISTRIBUTION);

/** {@link View} for client sent bytes per RPC. */
const GRPC_CLIENT_SENT_BYTES_PER_RPC_VIEW = globalStats.createView(
    'grpc.io/client/sent_bytes_per_rpc', GRPC_CLIENT_SENT_BYTES_PER_RPC,
    AggregationType.DISTRIBUTION, [GRPC_CLIENT_METHOD],
    'Distribution of bytes sent per RPC, by method.',
    DEFAULT_BYTES_DISTRIBUTION);

/** {@link View} for client roundtrip latency in milliseconds. */
const GRPC_CLIENT_ROUNDTRIP_LATENCY_VIEW = globalStats.createView(
    'grpc.io/client/roundtrip_latency', GRPC_CLIENT_ROUNDTRIP_LATENCY,
    AggregationType.DISTRIBUTION, [GRPC_CLIENT_METHOD],
    'Distribution of round-trip latency, by method.',
    DEFAULT_MILLI_SECONDS_DISTRIBUTION);

/**
 * {@link View} for completed client RPCs.
 *
 * This {@code View} uses measure {@code GRPC_CLIENT_ROUNDTRIP_LATENCY},
 * since completed RPCs can be inferred over any measure recorded once per RPC
 * (since it's just a count aggregation over the measure). It would be
 * unnecessary to use a separate "count" measure.
 */
const GRPC_CLIENT_COMPLETED_RPC_VIEW = globalStats.createView(
    'grpc.io/client/completed_rpcs', GRPC_CLIENT_ROUNDTRIP_LATENCY,
    AggregationType.COUNT, [GRPC_CLIENT_METHOD, GRPC_CLIENT_STATUS],
    'Count of RPCs by method and status.', DEFAULT_MESSAGE_COUNT_DISTRIBUTION);

export const GRPC_BASIC_CLIENT_VIEWS: View[] = [
  GRPC_CLIENT_RECEIVED_MESSAGES_PER_RPC_VIEW,
  GRPC_CLIENT_RECEIVED_BYTES_PER_RPC_VIEW,
  GRPC_CLIENT_SENT_MESSAGES_PER_RPC_VIEW, GRPC_CLIENT_SENT_BYTES_PER_RPC_VIEW,
  GRPC_CLIENT_ROUNDTRIP_LATENCY_VIEW, GRPC_CLIENT_COMPLETED_RPC_VIEW
];
