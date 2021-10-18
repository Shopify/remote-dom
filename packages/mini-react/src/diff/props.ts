import {KIND_COMPONENT} from '@remote-ui/core';

import type {RemoteNode} from '../types';

export function diffProps(
  remoteNode: RemoteNode,
  newProps: {[key: string]: any},
  oldProps: {[key: string]: any},
) {
  if (remoteNode.kind !== KIND_COMPONENT) return;

  const update: {[key: string]: any} = {};
  let needsUpdate = false;
  let prop: string;

  for (prop in oldProps) {
    if (prop !== 'children' && prop !== 'key' && !(prop in newProps)) {
      needsUpdate = true;
      update[prop] = undefined;
    }
  }

  for (prop in newProps) {
    if (
      prop !== 'children' &&
      prop !== 'key' &&
      oldProps[prop] !== newProps[prop]
    ) {
      needsUpdate = true;
      update[prop] = newProps[prop];
    }
  }

  if (needsUpdate) remoteNode.updateProps(update);
}
