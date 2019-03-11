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

import * as cls from '../internal/cls';
import {TagMap} from './tag-map';

const contextManager = cls.createNamespace();
export const EMPTY_TAG_MAP = new TagMap();
const CURRENT_TAG_MAP_KEY = 'current_tag_map';

/** Gets the current tag context. */
export function getCurrentTagMap(): TagMap {
  const tagsFromContext = contextManager.get(CURRENT_TAG_MAP_KEY);
  if (tagsFromContext) {
    return tagsFromContext as TagMap;
  }
  return EMPTY_TAG_MAP;
}

/**
 * Sets the current tag context.
 * @param tags The TagMap.
 */
export function setCurrentTagMap(tags: TagMap) {
  if (tags) {
    contextManager.set(CURRENT_TAG_MAP_KEY, tags);
  }
}

/** Clear the current tag context. */
export function clear() {
  contextManager.set(CURRENT_TAG_MAP_KEY, EMPTY_TAG_MAP);
}
