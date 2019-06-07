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
import { TagMap } from './tag-map';

export const EMPTY_TAG_MAP = new TagMap();
const CURRENT_TAG_MAP_KEY = 'current_tag_map';

/** Gets the current tag context. */
export function getCurrentTagContext(contextManager: cls.Namespace): TagMap {
  const tagsFromContext = contextManager.get(CURRENT_TAG_MAP_KEY);
  if (tagsFromContext) {
    return makeDeepCopy(tagsFromContext as TagMap);
  }
  return new TagMap();
}

/**
 * Sets the current tag context.
 * @param tags The TagMap.
 */
export function setCurrentTagContext(
  contextManager: cls.Namespace,
  tags: TagMap
) {
  contextManager.set(CURRENT_TAG_MAP_KEY, makeDeepCopy(tags));
}

/**
 * Enters the scope of code where the given `TagMap` is in the current context
 * (replacing the previous `TagMap`).
 * @param tags The TagMap to be set to the current context.
 * @param fn Callback function.
 * @returns The callback return.
 */
export function withTagContext<T>(
  contextManager: cls.Namespace,
  tags: TagMap,
  fn: cls.Func<T>
): T {
  const oldContext = getCurrentTagContext(contextManager);
  return contextManager.runAndReturn(() => {
    const newContext = new TagMap();
    for (const [tagKey, tagValue] of oldContext.tags) {
      newContext.set(tagKey, tagValue);
    }
    for (const [tagKey, tagValue] of tags.tags) {
      newContext.set(tagKey, tagValue);
    }
    setCurrentTagContext(contextManager, newContext);
    return fn();
  });
}

/** Clear the current tag context. */
export function clear(contextManager: cls.Namespace) {
  contextManager.set(CURRENT_TAG_MAP_KEY, new TagMap());
}

function makeDeepCopy(tags: TagMap) {
  const tagsCopy = new TagMap();
  for (const [tagKey, valueWithMetadata] of tags.tagsWithMetadata) {
    tagsCopy.set(
      tagKey,
      valueWithMetadata.tagValue,
      valueWithMetadata.tagMetadata
    );
  }
  return tagsCopy;
}
