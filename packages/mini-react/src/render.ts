import {KIND_ROOT} from '@remote-ui/core';

import {commitRoot, diff} from './diff';
import {createElement} from './create-element';
import {Fragment} from './Fragment';
import options from './options';
import type {
  ComponentChild,
  RemoteParentNode,
  ComponentInternal,
} from './types';

// Unlike Preact, this library does not support hydration, or providing a
// `replaceNode` that preserves some part of the existing tree.

/**
 * Renders a virtual node into a remote-ui node.
 */
export function render(vnode: ComponentChild, remoteNode: RemoteParentNode) {
  options._root?.(vnode, remoteNode);

  // To be able to support calling `render()` multiple times on the same
  // remote node, we need to obtain a reference to the previous tree. We do
  // this by assigning a new `_children` property to remote nodes which points
  // to the last rendered tree. By default this property is not present, which
  // means that we are mounting a new tree for the first time.
  const oldVNode = remoteNode._vnode;
  const newVNode = createElement(Fragment, null, vnode);
  remoteNode._vnode = newVNode;

  // List of effects that need to be called after diffing.
  const commitQueue: ComponentInternal<any, any>[] = [];

  const unaccountedForChildren =
    oldVNode || !('children' in remoteNode) ? null : remoteNode.children;

  diff(
    remoteNode,
    getRemoteRoot(remoteNode),
    newVNode,
    oldVNode,
    {},
    unaccountedForChildren?.length ? [...unaccountedForChildren] : null,
    commitQueue,
    null,
  );

  // Flush all queued effects
  commitRoot(commitQueue, newVNode);
}

function getRemoteRoot(node: RemoteParentNode) {
  return node.kind === KIND_ROOT ? node : node.root;
}
