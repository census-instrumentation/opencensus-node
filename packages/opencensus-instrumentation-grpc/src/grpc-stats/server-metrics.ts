const {globalStats, MeasureUnit, AggregationType} =
    require('@opencensus/core');

const serverReceivedMessagesPerRPC = globalStats.createMeasureInt64(
    'grpc.io/server/received_messages_per_rpc', MeasureUnit.UNIT,
    'Number of messages received in each RPC. Has value 1 for non-streaming RPCs.');
const serverSentBytesPerRPC = globalStats.createMeasureInt64(
    'grpc.io/server/sent_bytes_per_rpc', MeasureUnit.Byte,
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

const serverReceivedMessagesPerRPCView = globalStats.createView(
    'grpc.io/server/received_messages_per_rpc', serverReceivedMessagesPerRPC,
    AggregationType.COUNT, [{method: 'grpc_server_method'}],
    'Distribution of messages received count per RPC, by method.');
const serverSentBytesPerRPCView = globalStats.createView(
    'grpc.io/server/sent_bytes_per_rpc', serverSentBytesPerRPC,
    AggregationType.COUNT, [{method: 'grpc_server_method'}],
    'Distribution of total sent bytes per RPC, by method.');
const serverLatencyView = globalStats.createView(
    'grpc.io/server/server_latency', serverLatency,
    AggregationType.DISTRIBUTION, [{method: 'grpc_server_method'}],
    'Distribution of server latency in milliseconds, by method.');
const serverCompletedRPCsView = globalStats.createView(
    'grpc.io/server/completed_rpcs', serverLatency, AggregationType.COUNT,
    [{method: 'grpc_server_method'}, {name: 'grpc_server_status'}],
    'Count of RPCs by method and status.');
const serverSentMessagesPerRPCView = globalStats.createView(
    'grpc.io/server/sent_messages_per_rpc', serverSentMessagesPerRPC,
    AggregationType.DISTRIBUTION, [{method: 'grpc_server_method'}],
    'Distribution of messages received count per RPC, by method.');
const serverReceivedBytesPerRPCView = globalStats.createView(
    'grpc.io/server/received_bytes_per_rpc', serverReceivedBytesPerRPC,
    AggregationType.DISTRIBUTION, [{method: 'grpc_server_method'}],
    'Distribution of received bytes per RPC, by method.');

export const defaultServerViews = [
  serverReceivedBytesPerRPCView, serverSentMessagesPerRPCView,
  serverCompletedRPCsView, serverLatencyView, serverSentBytesPerRPCView,
  serverReceivedMessagesPerRPCView
];
