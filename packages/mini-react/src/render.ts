import type {RemoteRoot, RemoteChild} from '@remote-ui/core';
import {KIND_ROOT} from '@remote-ui/core';
import {EMPTY_OBJ} from './constants';
import {commitRoot, diff} from './diff/index';
import {createElement, Fragment} from './create-element';
import options from './options';
import type {Component} from './component';
import type {ComponentChild, ReactRemoteNode} from './types';

/**
 * Render a mini-react virtual node into a remote-ui node
 */
export function render(vnode: ComponentChild, remoteNode: ReactRemoteNode) {
  options._root?.(vnode, remoteNode);

  const oldVNode = remoteNode._children;
  const finalVNode = createElement(Fragment, null, [vnode]);
  remoteNode._children = finalVNode;

  // List of effects that need to be called after diffing.
  const commitQueue: Component[] = [];

  const existingChildren = remoteNode.children;

  diff(
    remoteNode,
    finalVNode,
    oldVNode,
    EMPTY_OBJ,
    // eslint-disable-next-line no-nested-ternary
    oldVNode ? null : existingChildren ? [...existingChildren] : null,
    commitQueue,
    EMPTY_OBJ,
    getRemoteRoot(remoteNode),
  );

  // Flush all queued effects
  commitRoot(commitQueue, finalVNode);
}

function getRemoteRoot(
  node: RemoteRoot<any, any> | RemoteChild<RemoteRoot<any, any>>,
): RemoteRoot<any, any> {
  return node.kind === KIND_ROOT ? node : node.root;
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * update
 */
// export function hydrate(vnode: ComponentChild, parentDom: ReactElement) {
//   render(vnode, parentDom, IS_HYDRATE);
// }
