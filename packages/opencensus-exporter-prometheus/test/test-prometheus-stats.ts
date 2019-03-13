/**
 * Copyright 2018, OpenCensus Authors
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

import {AggregationType, globalStats, Measure, MeasureUnit, TagMap} from '@opencensus/core';
import * as assert from 'assert';
import * as http from 'http';
import {PrometheusStatsExporter} from '../src/';

describe('Prometheus Stats Exporter', () => {
  const options = {port: 9464, startServer: false};
  const prometheusServerUrl = `http://localhost:${options.port}/metrics`;
  const tagKey1 = {name: 'tagKey1'};
  const tagValue1 = {value: 'tagValue1'};
  const tagKeys = [tagKey1];
  const tagMap = new TagMap();
  tagMap.set(tagKey1, tagValue1);

  let exporter: PrometheusStatsExporter;
  let measure: Measure;

  beforeEach((done) => {
    measure =
        globalStats.createMeasureDouble('testMeasureDouble', MeasureUnit.UNIT);
    exporter = new PrometheusStatsExporter(options);
    globalStats.registerExporter(exporter);
    exporter.startServer(done);
  });

  afterEach((done) => {
    exporter.stopServer(done);
    globalStats.clear();
  });

  it('should create a count aggregation', (done) => {
    const view = globalStats.createView(
        'ocnodemetrics/countview', measure, AggregationType.COUNT, tagKeys,
        'A count aggregation example');
    const measurement = {measure, value: 2};
    const measurement2 = {measure, value: 3};
    globalStats.registerView(view);
    globalStats.record([measurement, measurement2], tagMap);

    http.get(prometheusServerUrl, (res) => {
          res.on('data', (chunk) => {
            const body = chunk.toString();
            const lines = body.split('\n');

            assert.equal(
                lines[0],
                '# HELP ocnodemetrics_countview A count aggregation example');
            assert.equal(lines[1], '# TYPE ocnodemetrics_countview counter');
            assert.equal(
                lines[2], 'ocnodemetrics_countview{tagKey1="tagValue1"} 2');
            done();
          });
        }).on('error', done);
  });

  it('should create a sum aggregation', (done) => {
    const measure =
        globalStats.createMeasureDouble('testMeasureDouble', MeasureUnit.UNIT);
    const view = globalStats.createView(
        'ocnodemetrics/sumview', measure, AggregationType.SUM, tagKeys,
        'A sum aggregation example');
    const measurement = {measure, value: 2};
    const measurement2 = {measure, value: 3};
    globalStats.registerView(view);
    globalStats.record([measurement, measurement2], tagMap);

    http.get(prometheusServerUrl, (res) => {
          res.on('data', (chunk) => {
            const body = chunk.toString();
            const lines = body.split('\n');

            assert.equal(
                lines[0],
                '# HELP ocnodemetrics_sumview A sum aggregation example');
            assert.equal(lines[1], '# TYPE ocnodemetrics_sumview gauge');
            assert.equal(
                lines[2], 'ocnodemetrics_sumview{tagKey1="tagValue1"} 5');
            done();
          });
        }).on('error', done);
  });

  it('should create a sum aggregation with empty tagMap', (done) => {
    const measure =
        globalStats.createMeasureDouble('testMeasureDouble', MeasureUnit.UNIT);
    const view = globalStats.createView(
        'ocnodemetrics/sumview1', measure, AggregationType.SUM, tagKeys,
        'A sum aggregation example');
    const measurement = {measure, value: 2};
    const measurement2 = {measure, value: 3};
    globalStats.registerView(view);
    globalStats.record([measurement, measurement2]);

    http.get(prometheusServerUrl, (res) => {
          res.on('data', (chunk) => {
            const body = chunk.toString();
            const lines = body.split('\n');

            assert.equal(
                lines[0],
                '# HELP ocnodemetrics_sumview1 A sum aggregation example');
            assert.equal(lines[1], '# TYPE ocnodemetrics_sumview1 gauge');
            assert.equal(lines[2], 'ocnodemetrics_sumview1 5');
            done();
          });
        }).on('error', done);
  });

  it('should create a last value aggregation', (done) => {
    const measure =
        globalStats.createMeasureDouble('testMeasureDouble', MeasureUnit.UNIT);
    const view = globalStats.createView(
        'ocnodemetrics/lastvalueview', measure, AggregationType.LAST_VALUE,
        tagKeys, 'A last value aggregation example');
    const measurement = {measure, value: 2};
    const measurement2 = {measure, value: 3};
    globalStats.registerView(view);
    globalStats.record([measurement, measurement2], tagMap);

    http.get(prometheusServerUrl, (res) => {
          res.on('data', (chunk) => {
            const body = chunk.toString();
            const lines = body.split('\n');

            assert.equal(
                lines[0],
                '# HELP ocnodemetrics_lastvalueview A last value aggregation example');
            assert.equal(lines[1], '# TYPE ocnodemetrics_lastvalueview gauge');
            assert.equal(
                lines[2], 'ocnodemetrics_lastvalueview{tagKey1="tagValue1"} 3');
            done();
          });
        }).on('error', done);
  });

  it('should create a distribution aggregation', (done) => {
    const measure =
        globalStats.createMeasureDouble('testMeasureDouble', MeasureUnit.UNIT);
    const boundaries = [10, 20, 30, 40];
    const view = globalStats.createView(
        'ocnodemetrics/distributionview', measure, AggregationType.DISTRIBUTION,
        tagKeys, 'A distribution aggregation example', boundaries);
    const measurement = {measure, value: 12};
    const measurement2 = {measure, value: 31};
    globalStats.registerView(view);
    globalStats.record([measurement, measurement2], tagMap);

    http.get(prometheusServerUrl, (res) => {
          res.on('data', (chunk) => {
            const body = chunk.toString();
            const lines = body.split('\n');
            assert.equal(
                lines[0],
                '# HELP ocnodemetrics_distributionview A distribution aggregation example');
            assert.equal(
                lines[1], '# TYPE ocnodemetrics_distributionview histogram');
            assert.equal(
                lines[2],
                'ocnodemetrics_distributionview_bucket{le="10",tagKey1="tagValue1"} 0');
            assert.equal(
                lines[3],
                'ocnodemetrics_distributionview_bucket{le="20",tagKey1="tagValue1"} 1');
            assert.equal(
                lines[4],
                'ocnodemetrics_distributionview_bucket{le="30",tagKey1="tagValue1"} 1');
            assert.equal(
                lines[5],
                'ocnodemetrics_distributionview_bucket{le="40",tagKey1="tagValue1"} 2');
            assert.equal(
                lines[6],
                'ocnodemetrics_distributionview_bucket{le="+Inf",tagKey1="tagValue1"} 2');
            assert.equal(
                lines[7],
                'ocnodemetrics_distributionview_sum{tagKey1="tagValue1"} 43');
            assert.equal(
                lines[8],
                'ocnodemetrics_distributionview_count{tagKey1="tagValue1"} 2');
            done();
          });
        }).on('error', done);
  });

  it('should throw error when labels contains "le" label name in histogram label names',
     () => {
       const measure = globalStats.createMeasureDouble(
           'testMeasureDouble', MeasureUnit.UNIT);
       const tagKeyWithLe = {name: 'le'};
       const tagKeys = [tagKeyWithLe];
       const tagMap = new TagMap();
       tagMap.set(tagKeyWithLe, tagValue1);

       const boundaries = [10, 20, 30, 40];
       const view = globalStats.createView(
           'ocnodemetrics/distributionview1', measure,
           AggregationType.DISTRIBUTION, tagKeys,
           'A distribution aggregation example', boundaries);
       globalStats.registerView(view);
       const measurement = {measure, value: 2};

       assert.throws(() => {
         globalStats.record([measurement], tagMap);
       }, /^Error: le is a reserved label keyword$/);
     });
});

describe('Prometheus Stats Exporter with prefix option', () => {
  const options = {port: 9464, startServer: false, prefix: 'opencensus'};
  const prometheusServerUrl = `http://localhost:${options.port}/metrics`;
  const tagKeyWithLe = {name: 'le'};
  const tagValue1 = {value: 'tagValue1'};
  const tagKeys = [tagKeyWithLe];
  const tagMap = new TagMap();
  tagMap.set(tagKeyWithLe, tagValue1);
  let exporter: PrometheusStatsExporter;
  let measure: Measure;

  beforeEach((done) => {
    measure =
        globalStats.createMeasureDouble('testMeasureDouble', MeasureUnit.UNIT);
    exporter = new PrometheusStatsExporter(options);
    globalStats.registerExporter(exporter);
    exporter.startServer(done);
  });

  afterEach((done) => {
    exporter.stopServer(done);
    globalStats.clear();
  });

  it('should create a count aggregation with le labels', (done) => {
    const view = globalStats.createView(
        'test/key-1', measure, AggregationType.COUNT, tagKeys,
        'A count aggregation example');
    const measurement = {measure, value: 2};
    const measurement2 = {measure, value: 3};
    globalStats.registerView(view);
    globalStats.record([measurement, measurement2], tagMap);

    http.get(prometheusServerUrl, (res) => {
          res.on('data', (chunk) => {
            const body = chunk.toString();
            const lines = body.split('\n');

            assert.equal(
                lines[0],
                '# HELP opencensus_test_key_1 A count aggregation example');
            assert.equal(lines[1], '# TYPE opencensus_test_key_1 counter');
            assert.equal(lines[2], 'opencensus_test_key_1{le="tagValue1"} 2');
            done();
          });
        }).on('error', done);
  });
});
