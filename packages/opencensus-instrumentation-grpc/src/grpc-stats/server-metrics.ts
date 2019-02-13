import {AggregationType, globalStats, MeasureUnit, View} from '@opencensus/core';
import {DEFAULT_BYTES_DISTRIBUTION, DEFAULT_MESSAGE_COUNT_DISTRIBUTION, DEFAULT_MILLI_SECONDS_DISTRIBUTION} from './stats-common';

const serverReceivedMessagesPerRPC = globalStats.createMeasureInt64(
    'grpc.io/server/received_messages_per_rpc', MeasureUnit.UNIT,
    'Number of messages received in each RPC. Has value 1 for non-streaming RPCs.');
const serverSentBytesPerRPC = globalStats.createMeasureInt64(
    'grpc.io/server/sent_bytes_per_rpc', MeasureUnit.BYTE,
    'Total bytes sent in across all response messages per RPC');
const serverLatency = globalStats.createMeasureDouble(
    'grpc.io/server/server_latency', MeasureUnit.MS,
    'Time between first byte of request received to last byte of response sent, or terminal error.');
const serverSentMessagesPerRPC = globalStats.createMeasureInt64(
    'grpc.io/server/sent_messages_per_rpc', MeasureUnit.UNIT,
    'Number of messages sent in each RPC. Has value 1 for non-streaming RPCs.');
const serverReceivedBytesPerRPC = globalStats.createMeasureInt64(
    'grpc.io/server/received_bytes_per_rpc', MeasureUnit.BYTE,
    'Total bytes received across all messages per RPC.');

const methodKey = {
  name: 'grpc_server_method'
};
const statusKey = {
  name: 'grpc_server_status'
};

const serverReceivedMessagesPerRPCView = globalStats.createView(
    'grpc.io/server/received_messages_per_rpc', serverReceivedMessagesPerRPC,
    AggregationType.COUNT, [methodKey],
    'Distribution of messages received count per RPC, by method.',
    DEFAULT_MESSAGE_COUNT_DISTRIBUTION);
const serverSentBytesPerRPCView = globalStats.createView(
    'grpc.io/server/sent_bytes_per_rpc', serverSentBytesPerRPC,
    AggregationType.COUNT, [methodKey],
    'Distribution of total sent bytes per RPC, by method.',
    DEFAULT_BYTES_DISTRIBUTION);
const serverLatencyView = globalStats.createView(
    'grpc.io/server/server_latency', serverLatency,
    AggregationType.DISTRIBUTION, [methodKey],
    'Distribution of server latency in milliseconds, by method.',
    DEFAULT_MILLI_SECONDS_DISTRIBUTION);
const serverCompletedRPCsView = globalStats.createView(
    'grpc.io/server/completed_rpcs', serverLatency, AggregationType.COUNT,
    [methodKey, statusKey], 'Count of RPCs by method and status.',
    DEFAULT_MESSAGE_COUNT_DISTRIBUTION);
const serverSentMessagesPerRPCView = globalStats.createView(
    'grpc.io/server/sent_messages_per_rpc', serverSentMessagesPerRPC,
    AggregationType.DISTRIBUTION, [methodKey],
    'Distribution of messages received count per RPC, by method.',
    DEFAULT_MESSAGE_COUNT_DISTRIBUTION);
const serverReceivedBytesPerRPCView = globalStats.createView(
    'grpc.io/server/received_bytes_per_rpc', serverReceivedBytesPerRPC,
    AggregationType.DISTRIBUTION, [methodKey],
    'Distribution of received bytes per RPC, by method.',
    DEFAULT_BYTES_DISTRIBUTION);

export const defaultServerViews: View[] = [
  serverReceivedBytesPerRPCView, serverSentMessagesPerRPCView,
  serverCompletedRPCsView, serverLatencyView, serverSentBytesPerRPCView,
  serverReceivedMessagesPerRPCView
];
