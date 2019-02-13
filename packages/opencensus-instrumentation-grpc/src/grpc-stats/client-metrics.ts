const {globalStats, MeasureUnit, AggregationType, TagKey} =
    require('@opencensus/core');

const clientSentMessagesPerRPC = globalStats.createMeasureInt64(
    'grpc.io/client/sent_messages_per_rpc', MeasureUnit.UNIT,
    'Number of messages sent in the RPC (always 1 for non-streaming RPCs).');
const clientSentBytesPerRPC = globalStats.createMeasureInt64(
    'grpc.io/client/sent_bytes_per_rpc', MeasureUnit.BYTE,
    'Total bytes sent across all request messages per RPC.');
const clientReceivedMessagesPerRPC = globalStats.createMeasureInt64(
    'grpc.io/client/received_messages_per_rpc', MeasureUnit.UNIT,
    'Number of response messages received per RPC (always 1 for non-streaming RPCs).');
const clientReceivedBytesPerRPC = globalStats.createMeasureInt64(
    'grpc.io/client/received_bytes_per_rpc', MeasureUnit.BYTE,
    'Total bytes received across all response messages per RPC.');
const clientRoundtripLatency = globalStats.createMeasureDouble(
    'grpc.io/client/roundtrip_latency', MeasureUnit.MS,
    'Time between first byte of request sent to last byte of response received, or terminal error.');
const clientServerLatency = globalStats.createMeasureDouble(
    'grpc.io/client/server_latency', MeasureUnit.MS,
    'Propagated from the server and should have the same value as "grpc.io/server/latency');

const clientSentBytesPerRPCView = globalStats.createView(
    'grpc.io/client/sent_bytes_per_rpc', clientSentBytesPerRPC,
    AggregationType.DISTRIBUTION, [{method: 'grpc_client_method'}],
    'Distribution of bytes sent per RPC, by method.');
const clientReceivedBytesPerRPCView = globalStats.createView(
    'grpc.io/client/received_bytes_per_rpc', clientReceivedBytesPerRPC,
    AggregationType.DISTRIBUTION, [{method: 'grpc_client_method'}],
    'Distribution of bytes received per RPC, by method.');
const clientRoundtripLatencyView = globalStats.createView(
    'grpc.io/client/roundtrip_latency', clientRoundtripLatency,
    AggregationType.DISTRIBUTION, [{method: 'grpc_client_method'}],
    'Distribution of round-trip latency, by method.');
const clientCompletedRPCsView = globalStats.createView(
    'grpc.io/client/completed_rpcs', clientRoundtripLatency,
    AggregationType.COUNT,
    [{method: 'grpc_client_method'}, {name: 'grpc_client_status'}],
    'Count of RPCs by method and status.');
const clientSentMessagesPerRPCView = globalStats.createView(
    'grpc.io/client/sent_messages_per_rpc', clientSentMessagesPerRPC,
    AggregationType.DISTRIBUTION, [{method: 'grpc_client_method'}],
    'Distribution of sent messages count per RPC, by method.');
const clientReceivedMessagesPerRPCView = globalStats.createView(
    'grpc.io/client/received_messages_per_rpc', clientReceivedMessagesPerRPC,
    AggregationType.DISTRIBUTION, [{method: 'grpc_client_method'}],
    'Distribution of received messages count per RPC, by method.');
const clientServerLatencyView = globalStats.createView(
    'grpc.io/client/server_latency', clientServerLatency,
    AggregationType.DISTRIBUTION, [{method: 'grpc_client_method'}],
    'Distribution of server latency as viewed by client, by method.');

export const defaultClientViews = [
  clientSentBytesPerRPCView, clientReceivedBytesPerRPCView,
  clientRoundtripLatencyView, clientCompletedRPCsView,
  clientSentMessagesPerRPCView, clientReceivedMessagesPerRPCView,
  clientServerLatencyView
];
