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

import {AggregationType, Bucket, MetricDistributions, MetricSingleValues, Tags, View} from '@opencensus/core';

import {StatsParams} from '../../zpages';

const ejs = require('ejs');

import * as pkgDir from 'pkg-dir';
const templatesDir = `${pkgDir.sync(__dirname)}/templates`;

export interface StatszParams { path: string; }

type FolderType = {
  [key: string]: {path: string, isLastFolder: boolean, viewsCount: number}
};

type ZPagesDistribution = {
  tagKeys: string[],
  tagValues: string[],
  max: number,
  min: number,
  count: number,
  mean: number,
  sumOfSquaredDeviations: number,
  buckets: Bucket[]
};

type ZPagesSingleValue = {
  tagKeys: string[],
  tagValues: string[],
  value: number
};

export class StatszPageHandler {
  constructor(private statsParams: StatsParams) {}

  /**
   * Generate Zpages Stats HTML Page
   * @param params The incoming request query.
   * @param json If true, JSON will be emitted instead. Used for testing only.
   * @returns output HTML
   */
  emitHtml(params: Partial<StatszParams>, json: boolean): string {
    /** template HTML */
    const statszFile =
        ejs.fileLoader(`${templatesDir}/statsz.ejs`, 'utf8').toString();
    const directoriesFile =
        ejs.fileLoader(`${templatesDir}/statsz-directories.ejs`, 'utf8')
            .toString();
    /** EJS render options */
    const options = {delimiter: '?'};
    /** current path, empty is root folder */
    let path: string[] = [];
    /** current folder level */
    let folderLevel = 0;
    /** keeps the folders that belong to the current folder  */
    const folders: FolderType = {};
    /** selected view to show */
    let selectedView: View;
    /** keeps HTML table content */
    let tableContent: string;

    // gets the path from user
    if (params.path) {
      path = params.path.split('/');
      folderLevel = path.length - 1;
      // removing the last value if empty
      if (path[folderLevel] === '') {
        path.splice(folderLevel, 1);
      }
      folderLevel = path.length;
    }

    for (const view of this.statsParams.registeredViews) {
      /** view path array */
      const viewPath = view.name.split('/');
      /** indicates that current folder is the last in the tree */
      const isLastFolder = folderLevel === viewPath.length - 1;
      /** name of current folder */
      const folderName = viewPath[folderLevel];

      // checks if the current folder level is not root
      if (folderLevel > 0) {
        const parentFolder = path[folderLevel - 1];
        // if the current view doesn't belong to current folder, skip this
        // iteration
        if (parentFolder && parentFolder !== viewPath[folderLevel - 1]) {
          continue;
        }
        // checks if the folder level is the same view level
        if (folderLevel === viewPath.length) {
          selectedView = view;
          break;
        }
      }

      // if the current folder already in array
      if (folders[folderName]) {
        // just increase the view count
        folders[folderName].viewsCount += 1;
      } else {
        // adding the new folder to array
        let currentViewPath = '';
        for (let i = 0; i <= folderLevel; i++) {
          currentViewPath += viewPath[i] + '/';
        }
        folders[folderName] = {
          path: currentViewPath,
          viewsCount: 1,
          isLastFolder
        };
      }
    }

    if (selectedView) {
      const viewFile =
          ejs.fileLoader(`${templatesDir}//statsz-view.ejs`, 'utf8').toString();
      let viewContentFile: string;
      let statsContent: string;
      let statsData: ZPagesDistribution[]|ZPagesSingleValue[];

      switch (selectedView.aggregation) {
        case AggregationType.count:
          viewContentFile =
              ejs.fileLoader(`${templatesDir}/statsz-view-count.ejs`, 'utf8')
                  .toString();
          statsData = this.getSingleValueStatsData(selectedView);
          break;
        case AggregationType.sum:
          viewContentFile =
              ejs.fileLoader(`${templatesDir}/statsz-view-sum.ejs`, 'utf8')
                  .toString();
          statsData = this.getSingleValueStatsData(selectedView);
          break;
        case AggregationType.lastValue:
          viewContentFile =
              ejs.fileLoader(
                     `${templatesDir}/statsz-view-lastvalue.ejs`, 'utf8')
                  .toString();
          statsData = this.getSingleValueStatsData(selectedView);
          break;
        case AggregationType.distribution:
          viewContentFile =
              ejs.fileLoader(
                     `${templatesDir}/statsz-view-distribution.ejs`, 'utf8')
                  .toString();
          statsData = this.getDistributionStatsData(selectedView);
          break;
        default:
          break;
      }

      statsContent =
          ejs.render(viewContentFile, {view: selectedView, statsData}, options);
      tableContent = ejs.render(
          viewFile, {view: selectedView, stats_content: statsContent}, options);
    } else {
      tableContent = ejs.render(directoriesFile, {folders}, options);
    }

    if (json) {
      return JSON.stringify(this.statsParams, null, 2);
    } else {
      return ejs.render(
          statszFile, {
            registeredMeasures: this.statsParams.registeredMeasures,
            table_content: tableContent,
            path
          },
          options);
    }
  }

  /**
   *
   * @param selectedView
   */
  private getDistributionStatsData(selectedView: View): ZPagesDistribution[] {
    const snapshots = selectedView.getSnapshotValues() as MetricDistributions;
    return snapshots.map(snapshot => {
      return {
        tagKeys: Object.keys(snapshot.tags),
        tagValues: this.getTagValues(snapshot.tags),
        max: snapshot.max,
        min: snapshot.min,
        count: snapshot.count,
        mean: snapshot.mean,
        sumOfSquaredDeviations: snapshot.sumSquaredDeviations,
        buckets: snapshot.buckets
      };
    });
  }

  private getSingleValueStatsData(selectedView: View): ZPagesSingleValue[] {
    const snapshots = selectedView.getSnapshotValues() as MetricSingleValues;
    return snapshots.map(snapshot => {
      return {
        tagKeys: Object.keys(snapshot.tags),
        tagValues: this.getTagValues(snapshot.tags),
        value: snapshot.value
      };
    });
  }

  private getTagValues(tags: Tags): string[] {
    return Object.keys(tags).map((tagKey) => {
      return tags[tagKey];
    });
  }
}