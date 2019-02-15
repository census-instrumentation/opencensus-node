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

import {AggregationType, globalStats, MeasureUnit, View} from '@opencensus/core';
import {DEFAULT_BYTES_DISTRIBUTION, DEFAULT_MESSAGE_COUNT_DISTRIBUTION, DEFAULT_MILLI_SECONDS_DISTRIBUTION} from './stats-common';

/**
 * {@link Measure} for number of messages received in each RPC.
 *
 */
const GRPC_SERVER_RECEIVED_MESSAGES_PER_RPC = globalStats.createMeasureInt64(
    'grpc.io/server/received_messages_per_rpc', MeasureUnit.UNIT,
    'Number of messages received in each RPC. Has value 1 for non-streaming RPCs.');

/**
 * {@link Measure} for total bytes sent across all response messages per RPC.
 *
 */
const GRPC_SERVER_SENT_BYTES_PER_RPC = globalStats.createMeasureInt64(
    'grpc.io/server/sent_bytes_per_rpc', MeasureUnit.BYTE,
    'Total bytes sent in across all response messages per RPC');

/**
 * {@link Measure} for gRPC server latency in milliseconds.
 *
 */
const GRPC_SERVER_SERVER_LATENCY = globalStats.createMeasureDouble(
    'grpc.io/server/server_latency', MeasureUnit.MS,
    'Time between first byte of request received to last byte of response sent, or terminal error.');

/**
 * {@link Measure} for number of messages sent in each RPC.
 *
 */
const GRPC_SERVER_SENT_MESSAGES_PER_RPC = globalStats.createMeasureInt64(
    'grpc.io/server/sent_messages_per_rpc', MeasureUnit.UNIT,
    'Number of messages sent in each RPC. Has value 1 for non-streaming RPCs.');
/**
 * {@link Measure} for total bytes received across all messages per RPC.
 *
 */
const GRPC_SERVER_RECEIVED_BYTES_PER_RPC = globalStats.createMeasureInt64(
    'grpc.io/server/received_bytes_per_rpc', MeasureUnit.BYTE,
    'Total bytes received across all messages per RPC.');

/**
 * Tag key that represents a server gRPC method.
 *
 * <p>{@link #GRPC_SERVER_METHOD} is set when an incoming request starts and is
 * available in the context for the entire RPC call handling.
 *
 */
const GRPC_SERVER_METHOD = {
  name: 'grpc_server_method'
};

/**
 * Tag key that represents a server gRPC canonical status. Refer to
 * https://github.com/grpc/grpc/blob/master/doc/statuscodes.md.
 *
 * <p>{@link #GRPC_SERVER_STATUS} is set when an incoming request finishes and
 * is only available around metrics recorded at the end of the incoming request.
 *
 */
const GRPC_SERVER_STATUS = {
  name: 'grpc_server_status'
};

/**
 * {@link View} for server received messages per RPC.
 *
 */
const GRPC_SERVER_RECEIVED_MESSAGES_PER_RPC_VIEW = globalStats.createView(
    'grpc.io/server/received_messages_per_rpc',
    GRPC_SERVER_RECEIVED_MESSAGES_PER_RPC, AggregationType.COUNT,
    [GRPC_SERVER_METHOD],
    'Distribution of messages received count per RPC, by method.',
    DEFAULT_MESSAGE_COUNT_DISTRIBUTION);

/**
 * {@link View} for server sent bytes per RPC.
 *
 */
const GRPC_SERVER_SENT_BYTES_PER_RPC_VIEW = globalStats.createView(
    'grpc.io/server/sent_bytes_per_rpc', GRPC_SERVER_SENT_BYTES_PER_RPC,
    AggregationType.COUNT, [GRPC_SERVER_METHOD],
    'Distribution of total sent bytes per RPC, by method.',
    DEFAULT_BYTES_DISTRIBUTION);

/**
 * {@link View} for server server latency in milliseconds.
 *
 */
const GRPC_SERVER_SERVER_LATENCY_VIEW = globalStats.createView(
    'grpc.io/server/server_latency', GRPC_SERVER_SERVER_LATENCY,
    AggregationType.DISTRIBUTION, [GRPC_SERVER_METHOD],
    'Distribution of server latency in milliseconds, by method.',
    DEFAULT_MILLI_SECONDS_DISTRIBUTION);

/**
 * {@link View} for completed server RPCs.
 *
 * <p>This {@code View} uses measure {@code GRPC_SERVER_SERVER_LATENCY}, since
 * completed RPCs can be inferred over any measure recorded once per RPC (since
 * it's just a count aggregation over the measure). It would be unnecessary to
 * use a separate "count" measure.
 *
 */
const GRPC_SERVER_COMPLETED_RPC_VIEW = globalStats.createView(
    'grpc.io/server/completed_rpcs', GRPC_SERVER_SERVER_LATENCY,
    AggregationType.COUNT, [GRPC_SERVER_METHOD, GRPC_SERVER_STATUS],
    'Count of RPCs by method and status.', DEFAULT_MESSAGE_COUNT_DISTRIBUTION);

/**
 * {@link View} for server sent messages per RPC.
 *
 */
const GRPC_SERVER_SENT_MESSAGES_PER_RPC_VIEW = globalStats.createView(
    'grpc.io/server/sent_messages_per_rpc', GRPC_SERVER_SENT_MESSAGES_PER_RPC,
    AggregationType.DISTRIBUTION, [GRPC_SERVER_METHOD],
    'Distribution of messages received count per RPC, by method.',
    DEFAULT_MESSAGE_COUNT_DISTRIBUTION);

/**
 * {@link View} for server received bytes per RPC.
 *
 */
const GRPC_SERVER_RECEIVED_BYTES_PER_RPC_VIEW = globalStats.createView(
    'grpc.io/server/received_bytes_per_rpc', GRPC_SERVER_RECEIVED_BYTES_PER_RPC,
    AggregationType.DISTRIBUTION, [GRPC_SERVER_METHOD],
    'Distribution of received bytes per RPC, by method.',
    DEFAULT_BYTES_DISTRIBUTION);

export const GRPC_BASIC_SERVER_VIEWS: View[] = [
  GRPC_SERVER_RECEIVED_BYTES_PER_RPC_VIEW,
  GRPC_SERVER_SENT_MESSAGES_PER_RPC_VIEW, GRPC_SERVER_COMPLETED_RPC_VIEW,
  GRPC_SERVER_SERVER_LATENCY_VIEW, GRPC_SERVER_SENT_BYTES_PER_RPC_VIEW,
  GRPC_SERVER_RECEIVED_MESSAGES_PER_RPC_VIEW
];
