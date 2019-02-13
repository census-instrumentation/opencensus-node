import {Stats} from '@opencensus/core';

import {defaultClientViews} from './client-metrics';
import {defaultServerViews} from './server-metrics';

export const DEFAULT_BYTES_DISTRIBUTION: number[] = [
  0, 1024, 2048, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216,
  67108864, 268435456, 1073741824, 4294967296
];
export const DEFAULT_MILLI_SECONDS_DISTRIBUTION: number[] = [
  0,   0.01, 0.05, 0.1,  0.3,   0.6,   0.8,   1,     2,   3,   4,
  5,   6,    8,    10,   13,    16,    20,    25,    30,  40,  50,
  65,  80,   100,  130,  160,   200,   250,   300,   400, 500, 650,
  800, 1000, 2000, 5000, 10000, 20000, 50000, 100000
];
export const DEFAULT_MESSAGE_COUNT_DISTRIBUTION: number[] = [
  0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384,
  32768, 65536
];

/**
 * Contains the methods to register basic GRPC views.
 */
export class RPCViews {
  static registerAllGrpcViews(stats: Stats) {
    this.registerClientGrpcBasicViews(stats);
    this.registerServerGrpcBasicViews(stats);
  }

  static registerClientGrpcBasicViews(stats: Stats) {
    for (const CLIENT_VIEW of defaultClientViews) {
      stats.registerView(CLIENT_VIEW);
    }
  }

  static registerServerGrpcBasicViews(stats: Stats) {
    for (const SERVER_VIEW of defaultServerViews) {
      stats.registerView(SERVER_VIEW);
    }
  }
}
