/**
 * Copyright 2018 OpenCensus Authors.
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

import {Distribution, SingleValue, View} from '@opencensus/core';

import {StatsParams} from '../../zpages';

const ejs = require('ejs');

import * as pkgDir from 'pkg-dir';
const templatesDir = `${pkgDir.sync(__dirname)}/templates`;

const FIXED_SIZE = 3;

interface ZMeasureOrders {
  min: number;
  hr: number;
  tot: number;
}

interface ZMeasure {
  method: string;
  count: ZMeasureOrders;
  avgLatency: ZMeasureOrders;
  rate: ZMeasureOrders;
  input: ZMeasureOrders;
  output: ZMeasureOrders;
  errors: ZMeasureOrders;
}

enum DefaultMeasures {
  CLIENT_SENT_MESSAGES_PER_RPC = 'grpc.io/client/sent_messages_per_rpc',
  CLIENT_SENT_BYTES_PER_RPC = 'grpc.io/client/sent_bytes_per_rpc',
  CLIENT_RECEIVED_MESSAGES_PER_RPC = 'grpc.io/client/received_messages_per_rpc',
  CLIENT_RECEIVED_BYTES_PER_RPC = 'grpc.io/client/received_bytes_per_rpc',
  CLIENT_ROUDTRIP_LATENCY = 'grpc.io/client/roundtrip_latency',
  CLIENT_SERVER_LATENCY = 'grpc.io/client/server_latency',
  CLIENT_STARTED_RPCS = 'grpc.io/client/started_rpcs',
  SERVER_RECEIVED_MESSAGES_PER_RPC = 'grpc.io/server/received_messages_per_rpc',
  SERVER_RECEIVED_BYTES_PER_RPC = 'grpc.io/server/received_bytes_per_rpc',
  SERVER_SENT_MESSAGES_PER_RPC = 'grpc.io/server/sent_messages_per_rpc',
  SERVER_SENT_BYTES_PER_RPC = 'grpc.io/server/sent_bytes_per_rpc',
  SERVER_SERVER_LATENCY = 'grpc.io/server/server_latency',
  SERVER_STARTED_RPCS = 'grpc.io/server/started_rpcs'
}

enum DefaultViews {
  CLIENT_SENT_BYTES_PER_RPC = 'grpc.io/client/sent_bytes_per_rpc',
  CLIENT_RECEIVED_BYTES_PER_RPC = 'grpc.io/client/received_bytes_per_rpc',
  CLIENT_ROUDTRIP_LATENCY = 'grpc.io/client/roundtrip_latency',
  CLIENT_COMPLETED_RPCS = 'grpc.io/client/completed_rpcs',
  CLIENT_STARTED_RPCS = 'grpc.io/client/started_rpcs',
  SERVER_RECEIVED_BYTES_PER_RPC = 'grpc.io/server/received_bytes_per_rpc',
  SERVER_SENT_BYTES_PER_RPC = 'grpc.io/server/sent_bytes_per_rpc',
  SERVER_SERVER_LATENCY = 'grpc.io/server/server_latency',
  SERVER_COMPLETED_RPCS = 'grpc.io/server/completed_rpcs',
  SERVER_STARTED_RPCS = 'grpc.io/server/started_rpcs'
}

export class RpczPageHandler {
  constructor(private statsParams: StatsParams) {}

  /**
   * Generate Zpages RPC HTML Page
   * @param json If true, JSON will be emitted instead. Used for testing only.
   * @returns output HTML
   */
  emitHtml(json: boolean): string {
    /** template HTML */
    const rpczFile =
        ejs.fileLoader(`${templatesDir}/rpcz.ejs`, 'utf8').toString();
    /** EJS render options */
    const options = {delimiter: '?'};

    const rpcViews = this.statsParams.registeredViews.filter(view => {
      return view.name.indexOf('http') < 0;
    });

    const zMeasuresSent: {[key: string]: ZMeasure} = {};
    const zMeasuresReceived: {[key: string]: ZMeasure} = {};
    for (const view of rpcViews) {
      for (const snapshot of view.getSnapshotValues()) {
        let method = snapshot.tags['grpc_client_method'];
        let zMeasures = zMeasuresSent;

        if (!method) {
          method = snapshot.tags['grpc_server_method'];
          zMeasures = zMeasuresReceived;
        }

        if (method) {
          if (!zMeasures[method]) {
            zMeasures[method] = this.newEmptyZMeasure();
          }
          if (view.name === DefaultViews.CLIENT_SENT_BYTES_PER_RPC ||
              view.name === DefaultViews.SERVER_SENT_BYTES_PER_RPC) {
            const distribution = snapshot as Distribution;
            zMeasures[method].output.tot += distribution.sum;
            zMeasures[method].output.min =
                this.getRate(
                    zMeasures[method].output.tot, new Date(view.startTime)) *
                60;
            zMeasures[method].output.hr = zMeasures[method].output.min * 60;
          }
          if (view.name === DefaultViews.CLIENT_RECEIVED_BYTES_PER_RPC ||
              view.name === DefaultViews.SERVER_RECEIVED_BYTES_PER_RPC) {
            const distribution = snapshot as Distribution;
            zMeasures[method].input.tot += distribution.sum;
            zMeasures[method].input.min =
                this.getRate(
                    zMeasures[method].input.tot, new Date(view.startTime)) *
                60;
            zMeasures[method].input.hr = zMeasures[method].input.min * 60;
          }
          if (view.name === DefaultViews.CLIENT_COMPLETED_RPCS ||
              view.name === DefaultViews.SERVER_COMPLETED_RPCS) {
            const singleValue = snapshot as SingleValue;
            zMeasures[method].count.tot += singleValue.value;
            zMeasures[method].count.min =
                this.getRate(
                    zMeasures[method].count.tot, new Date(view.startTime)) *
                60;
            zMeasures[method].count.hr = zMeasures[method].count.min * 60;

            zMeasures[method].rate.tot = this.getRate(
                zMeasures[method].count.tot, new Date(view.startTime));
            zMeasures[method].rate.min = zMeasures[method].rate.tot * 60;
            zMeasures[method].rate.hr = zMeasures[method].rate.min * 60;

            const error = snapshot.tags['grpc_server_status'] &&
                snapshot.tags['grpc_server_status'] !== 'OK';
            if (error) {
              zMeasures[method].errors.tot += singleValue.value;
              zMeasures[method].errors.min =
                  this.getRate(
                      zMeasures[method].errors.tot, new Date(view.startTime)) *
                  60;
              zMeasures[method].errors.hr = zMeasures[method].errors.min * 60;
            }
          }
          if (view.name === DefaultViews.CLIENT_ROUDTRIP_LATENCY ||
              view.name === DefaultViews.SERVER_SERVER_LATENCY) {
            const distribution = snapshot as Distribution;
            zMeasures[method].avgLatency.tot = distribution.mean;
            zMeasures[method].avgLatency.min =
                this.getRate(
                    zMeasures[method].avgLatency.tot,
                    new Date(view.startTime)) *
                60;
            zMeasures[method].avgLatency.hr =
                zMeasures[method].avgLatency.min * 60;
          }
        }
      }
    }
    return ejs.render(
        rpczFile, {zMeasuresSent, zMeasuresReceived, FIXED_SIZE}, options);
  }

  private getRate(value: number, startTime: Date): number {
    return value / this.timeDiff(startTime, new Date());
  }

  private newEmptyZMeasure(): ZMeasure {
    return {
      method: '',
      count: {min: 0, hr: 0, tot: 0},
      avgLatency: {min: 0, hr: 0, tot: 0},
      rate: {min: 0, hr: 0, tot: 0},
      input: {min: 0, hr: 0, tot: 0},
      output: {min: 0, hr: 0, tot: 0},
      errors: {min: 0, hr: 0, tot: 0}
    };
  }

  private timeDiff(start: Date, end: Date) {
    // Gets the days' difference in seconds
    return (end.getDay() - start.getDay()) * 86400 +
        // Gets the hours' difference in seconds
        (end.getHours() - start.getHours()) * 3600 +
        // Gets the minutes' difference in seconds
        (end.getMinutes() - start.getMinutes()) * 60 +
        // Gets the seconds' difference
        (end.getSeconds() - start.getSeconds()) +
        // Gets the milliseconds' difference in seconds
        (end.getMilliseconds() - start.getMilliseconds()) / 1000;
  }
}