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

import {get} from 'http';
import * as logger from '../../common/console-logger';
import * as loggerTypes from '../../common/types';

/** Util methods for getting and parsing AWS instance identity document. */
export class AwsIdentityDocumentUtils {
  /** Aws instance identity URL */
  static HOST = '169.254.169.254';
  static readonly PATH = '/latest/dynamic/instance-identity/document';
  static readonly PORT = 80;
  static runned = false;
  static metadata: Record<string, string> = {};
  static promise: Promise<Record<string, string>>;
  static readonly logger: loggerTypes.Logger = logger.logger();

  /**
   * Establishes an HTTP connection to AWS instance identity document url.
   * If the application is running on an EC2 instance, we should be able
   * to get back a valid JSON document. Parses that document and stores
   * the identity properties in a local map.
   */
  static run() {
    if (AwsIdentityDocumentUtils.runned) {
      return AwsIdentityDocumentUtils.promise;
    }
    AwsIdentityDocumentUtils.promise =
        AwsIdentityDocumentUtils.getDocument().then(metadata => {
          if (Object.keys(metadata).length) {
            AwsIdentityDocumentUtils.metadata = metadata;
            AwsIdentityDocumentUtils.runned = true;
          }
          return metadata;
        });
    return AwsIdentityDocumentUtils.promise;
  }

  /**
   * Fetches the requested instance metadata entry.
   * @param name Attribute name relative to the computeMetadata/v1 prefix
   */
  private static getDocument() {
    const promise = new Promise((resolve, reject) => {
      get({
        host: AwsIdentityDocumentUtils.HOST,
        path: AwsIdentityDocumentUtils.PATH,
        port: AwsIdentityDocumentUtils.PORT
      },
          (response) => {
            let body = '';
            response.on('data', chunk => body += chunk);
            response.on('end', () => {
              if (response.statusCode >= 200 && response.statusCode < 300) {
                try {
                  const data = JSON.parse(body);
                  resolve(data);
                } catch (e) {
                  response.resume();
                }
              } else {
                const errorMessage =
                    `Request Failed. Status code: ${response.statusCode}`;
                AwsIdentityDocumentUtils.logger.error(errorMessage);
                reject(errorMessage);
                response.resume();
              }
            });
          });
    });
    return promise.catch(e => e);
  }

  /**
   * AWS Instance Identity Document is a JSON file.
   * See
   * docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-identity-documents.html.
   */
  getMetadata() {
    return AwsIdentityDocumentUtils.metadata;
  }

  static isRunning() {
    return AwsIdentityDocumentUtils.runned;
  }
}
