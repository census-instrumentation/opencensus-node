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

import {AggregationType, CountData, DistributionData} from '@opencensus/core';

import {StatsParams} from '../../zpages';

const ejs = require('ejs');

import * as pkgDir from 'pkg-dir';
const templatesDir = `${pkgDir.sync(__dirname)}/templates`;

const FIXED_SIZE = 3;

export interface ZMeasureOrders {
  min: number;
  hr: number;
  tot: number;
}

export interface ZMeasure {
  method: string;
  count: ZMeasureOrders;
  avgLatency: ZMeasureOrders;
  rate: ZMeasureOrders;
  input: ZMeasureOrders;
  output: ZMeasureOrders;
  errors: ZMeasureOrders;
}

/**
 * Information used to render the Rpcz UI.
 */
export interface RpczData {
  measuresSent: {[key: string]: ZMeasure};
  measuresReceived: {[key: string]: ZMeasure};
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
    /** CSS styles file */
    const stylesFile =
        ejs.fileLoader(`${templatesDir}/styles.min.css`).toString();
    /** EJS render options */
    const options = {delimiter: '?'};

    const rpcViews = this.statsParams.registeredViews.filter(
        view => view.name.indexOf('http') < 0);
    const rpczData: RpczData = {measuresSent: {}, measuresReceived: {}};

    for (const view of rpcViews) {
      const recordedData = this.statsParams.recordedData[view.name];
      for (const snapshot of recordedData) {
        let method = snapshot.tags['grpc_client_method'];
        let zMeasures = rpczData.measuresSent;

        // Switches to received data if it's a server
        if (!method) {
          method = snapshot.tags['grpc_server_method'];
          zMeasures = rpczData.measuresReceived;
        }

        if (method) {
          if (!zMeasures[method]) {
            zMeasures[method] = this.newEmptyZMeasure();
          }

          if (snapshot.type === AggregationType.DISTRIBUTION) {
            // Fills the output columns for that method
            if (view.name === DefaultViews.CLIENT_SENT_BYTES_PER_RPC ||
                view.name === DefaultViews.SERVER_SENT_BYTES_PER_RPC) {
              zMeasures[method].output.tot += snapshot.sum / 1024;
              zMeasures[method].output.min =
                  this.getRate(
                      zMeasures[method].output.tot, new Date(view.startTime)) *
                  60;
              zMeasures[method].output.hr = zMeasures[method].output.min * 60;
            }

            // Fills the input columns for that method
            if (view.name === DefaultViews.CLIENT_RECEIVED_BYTES_PER_RPC ||
                view.name === DefaultViews.SERVER_RECEIVED_BYTES_PER_RPC) {
              zMeasures[method].input.tot += snapshot.sum / 1024;
              zMeasures[method].input.min =
                  this.getRate(
                      zMeasures[method].input.tot, new Date(view.startTime)) *
                  60;
              zMeasures[method].input.hr = zMeasures[method].input.min * 60;
            }
          }

          if (snapshot.type === AggregationType.COUNT &&
              (view.name === DefaultViews.CLIENT_COMPLETED_RPCS ||
               view.name === DefaultViews.SERVER_COMPLETED_RPCS)) {
            // Fills the count columns for that method
            zMeasures[method].count.tot += snapshot.value;
            zMeasures[method].count.min =
                this.getRate(
                    zMeasures[method].count.tot, new Date(view.startTime)) *
                60;
            zMeasures[method].count.hr = zMeasures[method].count.min * 60;

            // Fills the rate columns for that method
            zMeasures[method].rate.tot = this.getRate(
                zMeasures[method].count.tot, new Date(view.startTime));
            zMeasures[method].rate.min = zMeasures[method].rate.tot * 60;
            zMeasures[method].rate.hr = zMeasures[method].rate.min * 60;

            // Fills the error columns for that method
            const error = (snapshot.tags['grpc_client_status'] ||
                           snapshot.tags['grpc_server_status']) &&
                (snapshot.tags['grpc_client_status'] !== 'OK' ||
                 snapshot.tags['grpc_server_status'] !== 'OK');
            if (error) {
              zMeasures[method].errors.tot += snapshot.value;
              zMeasures[method].errors.min =
                  this.getRate(
                      zMeasures[method].errors.tot, new Date(view.startTime)) *
                  60;
              zMeasures[method].errors.hr = zMeasures[method].errors.min * 60;
            }
          }

          // Fills the avgLatency columns for that method
          if (snapshot.type === AggregationType.DISTRIBUTION &&
              (view.name === DefaultViews.CLIENT_ROUDTRIP_LATENCY ||
               view.name === DefaultViews.SERVER_SERVER_LATENCY)) {
            zMeasures[method].avgLatency.tot = snapshot.mean;
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
    if (json) {
      return JSON.stringify(rpczData, null, 2);
    } else {
      return ejs.render(
          rpczFile, {
            styles: stylesFile,
            zMeasuresSent: rpczData.measuresSent,
            zMeasuresReceived: rpczData.measuresReceived,
            FIXED_SIZE
          },
          options);
    }
  }

  /**
   * Returns the rate of a value in seconds.
   * @param value The value to get a rate from
   * @param startTime The value's colection start time
   */
  private getRate(value: number, startTime: Date): number {
    return value / this.timeDiff(startTime, new Date());
  }

  /** Creates an empty zPages' format measure */
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

  /**
   * Calculates the difference between two timestamps in seconds.
   * @param start The start time
   * @param end The end time
   */
  private timeDiff(start: Date, end: Date) {
    // Gets the days' difference in seconds
    return (end.getTime() - start.getTime()) * 1000;
  }
}
