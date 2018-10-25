/**
 * Copyright 2018, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as nock from 'nock';

import * as logger from '../src/common/console-logger';
import {AwsIdentityDocumentUtils} from '../src/common/monitored-resource/aws-identity-document-utils';
import {GcpMetadataConfig} from '../src/common/monitored-resource/gcp-metadata-config';
import * as resources from '../src/common/monitored-resource/monitored-resource';
import {monitoredResourceAttributes, MonitoredResources} from '../src/common/monitored-resource/types';
import {MonitoredResourceUtil} from '../src/common/monitored-resource/util';

describe('MonitoredResourceUtil get default resource', () => {
  const testLogger = logger.logger();
  let dryrun = true;
  const GOOGLE_APPLICATION_CREDENTIALS =
      process.env.GOOGLE_APPLICATION_CREDENTIALS as string;
  const OPENCENSUS_NETWORK_TESTS =
      process.env.OPENCENSUS_NETWORK_TESTS as string;
  let PROJECT_ID = 'fake-project-id';

  const env = Object.assign({}, process.env);
  const gcpUrl = GcpMetadataConfig.URL;

  before(() => {
    if (GOOGLE_APPLICATION_CREDENTIALS) {
      dryrun = !fs.existsSync(GOOGLE_APPLICATION_CREDENTIALS) &&
          !fs.existsSync(OPENCENSUS_NETWORK_TESTS);
      if (!dryrun) {
        const credentials = require(GOOGLE_APPLICATION_CREDENTIALS);
        PROJECT_ID = credentials.project_id;
        testLogger.debug(
            'GOOGLE_APPLICATION_CREDENTIALS: %s',
            GOOGLE_APPLICATION_CREDENTIALS);
        testLogger.debug('projectId = %s', PROJECT_ID);
      }
    }
    if (dryrun) {
      nock.disableNetConnect();
    }
    testLogger.debug('dryrun=%s', dryrun);
    GcpMetadataConfig.URL = 'fake.service.io';
  });

  after(() => {
    GcpMetadataConfig.URL = gcpUrl;
  });

  beforeEach(() => {
    process.env = Object.assign({}, env);
    nock.cleanAll();
  });

  function doGcpMetadataConfigNock(key: string) {
    const resource = monitoredResourceAttributes[key];
    Object.keys(resource).forEach(prop => {
      const url = `http://${GcpMetadataConfig.URL}:${GcpMetadataConfig.PORT}`;
      nock(url).persist().get('/' + resource[prop]).reply(200, resource[prop]);
    });
  }

  describe('GcpGkeMonitoredResource', () => {
    after(() => {
      GcpMetadataConfig.metadata = {};
      GcpMetadataConfig.runned = false;
    });

    beforeEach(() => {
      process.env['KUBERNETES_SERVICE_HOST'] = 'kubernetis.test';
      doGcpMetadataConfigNock('GKE');
    });

    it('should initialize GCP GKE if KUBERNETES_SERVICE_HOST defined',
       async () => {
         await MonitoredResourceUtil.getDefaultResource().then(resource => {
           assert.notEqual(resource, null);
           assert.ok(resource instanceof resources.GcpGkeMonitoredResource);
           assert.strictEqual(
               resource.type, MonitoredResources.GCP_GKE_CONTAINER);
         });
       });

    it('should has metadata', async () => {
      await MonitoredResourceUtil.getDefaultResource().then(resource => {
        assert.deepEqual(resource.getLabels(), monitoredResourceAttributes.GKE);
      });
    });
  });

  describe('GcpGceMonitoredResource', () => {
    after(() => {
      GcpMetadataConfig.metadata = {};
      GcpMetadataConfig.runned = false;
    });
    beforeEach(() => {
      doGcpMetadataConfigNock('GCE');
    });
    it('should initialize GCP GCE if metadata is received', async () => {
      await MonitoredResourceUtil.getDefaultResource().then(resource => {
        assert.notEqual(resource, null);
        assert.ok(resource instanceof resources.GcpGceMonitoredResource);
        assert.strictEqual(resource.type, MonitoredResources.GCP_GCE_INSTANCE);
      });
    });

    it('should has metadata', async () => {
      await MonitoredResourceUtil.getDefaultResource().then(resource => {
        assert.deepEqual(resource.getLabels(), monitoredResourceAttributes.GCE);
      });
    });
  });

  describe('AwsMonitoredResource', () => {
    function doNock() {
      const resource = monitoredResourceAttributes.AWS;
      const url = `http://${AwsIdentityDocumentUtils.HOST}:${
          AwsIdentityDocumentUtils.PORT}`;
      nock(url).get(AwsIdentityDocumentUtils.PATH).reply(200, resource);
    }

    it('should initialize AWS identity document util if is running on AWS',
       async () => {
         doNock();
         await MonitoredResourceUtil.getDefaultResource().then(resource => {
           assert.notEqual(resource, null);
           assert.ok(resource instanceof resources.AwsMonitoredResource);
           assert.strictEqual(
               resource.type, MonitoredResources.AWS_EC2_INSTANCE);
         });
       });

    it('should has metadata', async () => {
      doNock();
      await MonitoredResourceUtil.getDefaultResource().then(resource => {
        assert.deepEqual(resource.getLabels(), monitoredResourceAttributes.AWS);
      });
    });
  });
});
