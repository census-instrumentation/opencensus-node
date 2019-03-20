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

import {AggregationData, AggregationType, TagKey, TagValue, View} from '@opencensus/core';
import {StatsParams} from '../../zpages';

const ejs = require('ejs');

import * as pkgDir from 'pkg-dir';

export interface StatszParams {
  path: string;
}

type FolderType = {
  [key: string]: {path: string, isLastFolder: boolean, viewsCount: number}
};

// AggregationData in zPages format
export type ZPagesStatsData = {
  tagKeys: TagKey[],
  tagValues?: TagValue[],
  snapshot?: AggregationData
};

/**
 * Information used to render the Statsz UI.
 */
export interface StatsViewData {
  view: View;
  statsData: ZPagesStatsData[];
}

/** Handles the data transformation and feeds to the HTML page. */
export class StatszPageHandler {
  constructor(private statsParams: StatsParams) {}

  /**
   * Generate Zpages Stats HTML Page
   * @param params The incoming request query.
   * @param json If true, JSON will be emitted instead. Used for testing only.
   */
  emitHtml(params: Partial<StatszParams>, json: boolean): string {
    /** template HTML */
    const statszFile = this.loaderFile('statsz.ejs');
    const directoriesFile = this.loaderFile('statsz-directories.ejs');
    /** CSS styles file */
    const stylesFile = this.loaderFile('styles.min.css');
    /** EJS render options */
    const options = {delimiter: '?'};
    /** current path, empty is root folder */
    let path: string[] = [];
    /** current folder level */
    let folderLevel = 0;
    /** keeps the folders that belong to the current folder  */
    const folders: FolderType = {};
    /** selected view to show */
    let selectedView: View|undefined;
    /** keeps HTML table content */
    let tableContent: string;
    /** keeps the stats and view data to load UI */
    let statsViewData: StatsViewData|undefined;

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
      const statsData = this.getStatsData(selectedView);
      const viewFile = this.loaderFile('statsz-view.ejs');
      let viewContentFile: string|undefined;
      let statsContent: string;

      switch (selectedView.aggregation) {
        // Loads the count aggregation type
        case AggregationType.COUNT:
          viewContentFile = this.loaderFile('statsz-view-count.ejs');
          break;

        // Loads the sum aggregation type
        case AggregationType.SUM:
          viewContentFile = this.loaderFile('statsz-view-sum.ejs').toString();
          break;

        // Loads the last value aggregation type
        case AggregationType.LAST_VALUE:
          viewContentFile = this.loaderFile('statsz-view-lastvalue.ejs');
          break;

        // Loads the distribution aggregation type
        case AggregationType.DISTRIBUTION:
          viewContentFile = this.loaderFile('statsz-view-distribution.ejs');
          break;
        default:
          break;
      }

      statsViewData = {view: selectedView, statsData};
      statsContent = ejs.render(viewContentFile, statsViewData, options);
      tableContent = ejs.render(
          viewFile, {view: selectedView, stats_content: statsContent}, options);
    } else {
      tableContent = ejs.render(directoriesFile, {folders}, options);
    }

    if (json) {
      return JSON.stringify(statsViewData, null, 2);
    } else {
      return ejs.render(
          statszFile, {
            styles: stylesFile,
            registeredMeasures: this.statsParams.registeredMeasures,
            table_content: tableContent,
            path
          },
          options);
    }
  }

  /**
   * Extracts values needed to render the statsz page.
   * @param selectedView The current view
   */
  private getStatsData(selectedView: View): ZPagesStatsData[] {
    const recordedData = this.statsParams.recordedData[selectedView.name];
    if (!recordedData) {
      return [{tagKeys: selectedView.getColumns()}];
    }
    return recordedData.map(snapshot => {
      return {
        tagKeys: selectedView.getColumns(),
        tagValues: snapshot.tagValues,
        snapshot
      };
    });
  }

  /**
   * Loader an file from templates folder
   * @param fileName name of the file will be to load with extension
   * file
   */
  private loaderFile(fileName: string): string {
    const rootDir = `${pkgDir.sync(__dirname)}`;
    return ejs.fileLoader(`${rootDir}/templates/${fileName}`, 'utf8');
  }
}
