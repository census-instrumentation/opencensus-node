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

import { Stats } from '@opencensus/core';
import { GRPC_BASIC_CLIENT_VIEWS } from './client-stats';
import { GRPC_BASIC_SERVER_VIEWS } from './server-stats';

/** Method to register all GRPC Views. */
export function registerAllGrpcViews(globalStats: Stats) {
  registerClientGrpcBasicViews(globalStats);
  registerServerGrpcBasicViews(globalStats);
}
/** Method to register just the client GRPC Views. */
export function registerClientGrpcBasicViews(globalStats: Stats) {
  for (const GRPC_CLIENT_VIEW of GRPC_BASIC_CLIENT_VIEWS) {
    globalStats.registerView(GRPC_CLIENT_VIEW);
  }
}
/** Method to register just the server GRPC Views. */
export function registerServerGrpcBasicViews(globalStats: Stats) {
  for (const SERVER_VIEW of GRPC_BASIC_SERVER_VIEWS) {
    globalStats.registerView(SERVER_VIEW);
  }
}
