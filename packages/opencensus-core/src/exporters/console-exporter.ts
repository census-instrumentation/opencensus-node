/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import { RootSpan } from '../trace/model/types';
import { Exporter, ExporterOptions } from '../exporters/types';


/** Do not send span data */
export class NoopExporter implements Exporter {
  publish(rootSpans: RootSpan[]) { }
}

/** Format and sends span data to the console. */
export class ConsoleLogExporter implements Exporter {
  /**
   * Sends the spans information to the console.
   * @param rootSpans
   */
  publish(rootSpans: RootSpan[]) {
    rootSpans.map((root) => {
      const ROOT_STR: string = (`
                RootSpan: {traceId: ${root.traceId}, 
                spanId: ${root.id}, 
                name: ${root.name} }`);
      const SPANS_STR: string[] = root.spans.map((span) => `   ChildSpan: 
                    {traceId: ${span.traceId}, 
                    spanId: ${span.id}, 
                    name: ${span.name} }`);
      const result: string[] = [];

      result.push(ROOT_STR);
      result.push(`${SPANS_STR.join('')}`);
      console.log(`${result}`);
    });
  }
}
