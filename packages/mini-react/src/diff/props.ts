// import {IS_NON_DIMENSIONAL} from '../constants';
// import options from '../options';

import type {RemoteComponent} from '@remote-ui/core';

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 */
export function diffProps(
  remote: RemoteComponent<any, any>,
  newProps: {[key: string]: any},
  oldProps: {[key: string]: any},
) {
  let key: string;

  const update: {[key: string]: any} = {};

  for (key in oldProps) {
    if (key !== 'children' && key !== 'key' && !(key in newProps)) {
      update[key] = undefined;
    }
  }

  for (key in newProps) {
    if (
      key !== 'children' &&
      key !== 'key' &&
      oldProps[key] !== newProps[key]
    ) {
      update[key] = newProps[key];
    }
  }

  remote.updateProps(update);
}
