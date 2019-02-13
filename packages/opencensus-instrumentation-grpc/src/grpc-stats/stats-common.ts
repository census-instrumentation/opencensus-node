import { Stats } from '@opencensus/core';
import {defaultClientViews} from './client-metrics';
import {defaultServerViews} from './server-metrics';

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
