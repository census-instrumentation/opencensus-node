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

import {globalStats} from '@opencensus/core';
import {GRPC_BASIC_CLIENT_VIEWS} from './client-metrics';
import {GRPC_BASIC_SERVER_VIEWS} from './server-metrics';

/**
 * Common histogram bucket boundaries for bytes received/sets Views.
 * 
 */ 
export const DEFAULT_BYTES_DISTRIBUTION: number[] = [
  0, 1024, 2048, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216,
  67108864, 268435456, 1073741824, 4294967296
];

/** 
 * Common histogram bucket boundaries for latency and elapsed-time Views.
 * 
 */ 
export const DEFAULT_MILLI_SECONDS_DISTRIBUTION: number[] = [
  0,   0.01, 0.05, 0.1,  0.3,   0.6,   0.8,   1,     2,   3,   4,
  5,   6,    8,    10,   13,    16,    20,    25,    30,  40,  50,
  65,  80,   100,  130,  160,   200,   250,   300,   400, 500, 650,
  800, 1000, 2000, 5000, 10000, 20000, 50000, 100000
];

/**
 * Common histogram bucket boundaries for request/response count Views.
 * 
 */
export const DEFAULT_MESSAGE_COUNT_DISTRIBUTION: number[] = [
  0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384,
  32768, 65536
];

/**
 * Method to register all GRPC Views.
 */
export function registerAllGrpcViews() {
  registerClientGrpcBasicViews();
  registerServerGrpcBasicViews();
}
/**
 * Method to register just the client GRPC Views.
 */
export function registerClientGrpcBasicViews() {
  for (const GRPC_CLIENT_VIEW of GRPC_BASIC_CLIENT_VIEWS) {
    globalStats.registerView(GRPC_CLIENT_VIEW);
  }
}
/**
 * Method to register just the server GRPC Views.
 */
export function registerServerGrpcBasicViews() {
  for (const SERVER_VIEW of GRPC_BASIC_SERVER_VIEWS) {
    globalStats.registerView(SERVER_VIEW);
  }
}
