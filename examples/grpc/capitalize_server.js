/**
 * Copyright 2019, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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

const path = require('path');
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');
const tracing = require('@opencensus/nodejs');
const { plugin } = require('@opencensus/instrumentation-grpc');
const { StackdriverTraceExporter } =
    require('@opencensus/exporter-stackdriver');

const tracer = setupTracerAndExporters();

const PROTO_PATH = path.join(__dirname, 'protos/defs.proto');
const PROTO_OPTIONS = { keepCase: true, enums: String, defaults: true, oneofs: true };
const definition = protoLoader.loadSync(PROTO_PATH, PROTO_OPTIONS);
const rpcProto = grpc.loadPackageDefinition(definition).rpc;

/** Implements the Capitalize RPC method. */
function capitalize (call, callback) {
  const span = tracer.startChildSpan({ name: 'octutorials.FetchImpl.capitalize' });
  const data = call.request.data.toString('utf8');
  const capitalized = data.toUpperCase();
  for (let i = 0; i < 100000000; i++) {}
  span.end();
  callback(null, { data: Buffer.from(capitalized) });
}

/**
 * Starts an RPC server that receives requests for the Fetch service at the
 * sample server port.
 */
function main () {
  const server = new grpc.Server();
  server.addService(rpcProto.Fetch.service, { capitalize: capitalize });
  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
  server.start();
}

function setupTracerAndExporters () {
  // Enable OpenCensus exporters to export traces to Stackdriver CloudTrace.
  // Exporters use Application Default Credentials (ADCs) to authenticate.
  // See https://developers.google.com/identity/protocols/application-default-credentials
  // for more details.
  // Expects ADCs to be provided through the environment as ${GOOGLE_APPLICATION_CREDENTIALS}
  // A Stackdriver workspace is required and provided through the environment as ${GOOGLE_PROJECT_ID}
  const projectId = process.env.GOOGLE_PROJECT_ID;

  // GOOGLE_APPLICATION_CREDENTIALS are expected by a dependency of this code
  // Not this code itself. Checking for existence here but not retaining (as not needed)
  if (!projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw Error('Unable to proceed without a Project ID');
  }
  // Creates Stackdriver exporter
  const exporter = new StackdriverTraceExporter({ projectId: projectId });

  // Starts Stackdriver exporter
  tracing.registerExporter(exporter).start();

  // Starts tracing and set sampling rate
  const tracer = tracing.start({
    samplingRate: 1 // For demo purposes, always sample
  }).tracer;

  // Defines basedir and version
  const basedir = path.dirname(require.resolve('grpc'));
  const version = require(path.join(basedir, 'package.json')).version;

  // Enables GRPC plugin: Method that enables the instrumentation patch.
  plugin.enable(grpc, tracer, version, /** plugin options */{}, basedir);

  return tracer;
}

main();
