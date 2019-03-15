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

const core = require('@opencensus/core');

const K1 = { name: 'k1' };
const K2 = { name: 'k2' };
const V1 = { value: 'v1' };
const V2 = { value: 'v2' };

const mLatencyMs = core.globalStats.createMeasureDouble(
  'm1', core.MeasureUnit.MS, '1st test metric'
);

/** Main method. */
function main () {
  const tags1 = new core.TagMap();
  tags1.set(K1, V1);

  core.withTagContext(tags1, () => {
    console.log('Enter Scope 1');
    printMap('Add Tags', tags1.tags);
    printMap('Current Tags == Default + tags1:', core.getCurrentTagContext().tags);

    const tags2 = new core.TagMap();
    tags2.set(K2, V2);
    core.withTagContext(tags2, () => {
      console.log('Enter Scope 2');
      printMap('Add Tags', tags2.tags);
      printMap('Current Tags == Default + tags1 + tags2:', core.getCurrentTagContext().tags);

      const measurement = { measure: mLatencyMs, value: 10 };
      core.globalStats.record([measurement]);
      console.log('Close Scope 2');
    });
    printMap('Current Tags == Default + tags1:', core.getCurrentTagContext().tags);
    console.log('Close Scope 1');
  });
}

function printMap (message, myMap) {
  var tags = `    ${message}`;
  for (var [key, value] of myMap) {
    tags += ` ${key.name} = ${value.value}`;
  }
  console.log(tags);
}

main();
