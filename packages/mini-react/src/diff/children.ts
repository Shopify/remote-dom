import type {RemoteChild} from '@remote-ui/core';

import {createVNode} from '../create-element';
import {Fragment} from '../Fragment';
import {getRemoteSibling} from '../Component';
import {EMPTY_ARRAY} from '../constants';
import {removeNode} from '../utilities';
import type {
  Ref,
  VNode,
  ComponentInternal,
  ComponentChildren,
  RemoteRootNode,
  RemoteParentNode,
  RemoteChildNode,
} from '../types';
import {diff, unmount, applyRef} from './diff';

/**
 * Diff the children of a virtual node.
 */
export function diffChildren(
  parentNode: RemoteParentNode,
  remoteRoot: RemoteRootNode,
  renderResult: ComponentChildren[],
  newParentVNode: VNode<any>,
  oldParentVNode: VNode<any> | undefined,
  globalContext: object,
  excessRemoteChildren: (RemoteChildNode | null | undefined)[] | null,
  commitQueue: ComponentInternal<any, any>[],
  oldRemoteNode?: RemoteChildNode | null,
) {
  const oldChildren = oldParentVNode?._children ?? EMPTY_ARRAY;
  const oldChildrenLength = oldChildren.length;

  let resolvedOldRemoteNode: typeof oldRemoteNode | null = oldRemoteNode;
  // Only in very specific places should this logic be invoked (top level `render` and `diffElementNodes`).
  // I'm using `EMPTY_OBJ` to signal when `diffChildren` is invoked in these situations. I can't use `null`
  // for this purpose, because `null` is a valid value for `oldDom` which can mean to skip to this logic
  // (e.g. if mounting a new tree in which the old DOM should be ignored (usually for Fragments).
  if (resolvedOldRemoteNode == null) {
    if (excessRemoteChildren != null) {
      resolvedOldRemoteNode = excessRemoteChildren[0];
    } else if (oldChildrenLength) {
      resolvedOldRemoteNode = getRemoteSibling(oldParentVNode!, 0);
    } else {
      resolvedOldRemoteNode = null;
    }
  }

  newParentVNode._children = [];

  let index: number;
  let refs!: [Ref<any>, any, VNode<any>][];
  let firstRemoteNode: RemoteChildNode | undefined;

  for (index = 0; index < renderResult.length; index++) {
    const rendered = renderResult[index];
    let childVNode: VNode<any> | undefined | null;

    if (rendered == null || typeof rendered === 'boolean') {
      childVNode = null;
    } else if (typeof rendered === 'string' || typeof rendered === 'number') {
      childVNode = createVNode(null, rendered, null, undefined, rendered);
    } else if (Array.isArray(rendered)) {
      childVNode = createVNode(
        Fragment,
        {children: rendered},
        null,
        undefined,
        null,
      );
    } else if (
      (rendered as VNode<any>)._remoteNode != null ||
      (rendered as VNode<any>)._component != null
    ) {
      childVNode = createVNode(
        (rendered as VNode<any>).type,
        (rendered as VNode<any>).props,
        (rendered as VNode<any>).key,
        undefined,
        (rendered as VNode<any>)._original,
      );
    } else {
      childVNode = rendered as VNode<any> | null;
    }

    newParentVNode._children[index] = childVNode;

    // Terser removes the `continue` here and wraps the loop body
    // in a `if (childVNode) { ... } condition
    if (childVNode == null) {
      continue;
    }

    childVNode._parent = newParentVNode;
    childVNode._depth = newParentVNode._depth + 1;

    // Check if we find a corresponding element in oldChildren.
    // If found, delete the array item by setting to `undefined`.
    // We use `undefined`, as `null` is reserved for empty placeholders
    // (holes).
    let oldVNode = oldChildren[index];

    if (
      oldVNode === null ||
      (oldVNode &&
        childVNode.key === oldVNode.key &&
        childVNode.type === oldVNode.type)
    ) {
      oldChildren[index] = undefined;
    } else {
      // Either oldVNode === undefined or oldChildrenLength > 0,
      // so after this loop oldVNode == null or oldVNode is a valid value.
      for (let oldIndex = 0; oldIndex < oldChildrenLength; oldIndex++) {
        oldVNode = oldChildren[oldIndex];
        // If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
        // We always match by type (in either case).
        if (
          oldVNode &&
          childVNode.key === oldVNode.key &&
          childVNode.type === oldVNode.type
        ) {
          oldChildren[oldIndex] = undefined;
          break;
        }

        oldVNode = null;
      }
    }

    // Morph the old element into the new one, but don't append it to the dom yet
    const newRemoteNode = diff(
      parentNode,
      remoteRoot,
      childVNode,
      oldVNode ?? undefined,
      globalContext,
      excessRemoteChildren,
      commitQueue,
      resolvedOldRemoteNode,
    );

    const ref = childVNode.ref;

    if (ref && oldVNode?.ref !== ref) {
      if (!refs) {
        refs = [];
      }

      if (oldVNode?.ref) {
        refs.push([oldVNode.ref, null, childVNode]);
      }

      refs.push([ref, childVNode._component ?? newRemoteNode, childVNode]);
    }

    if (newRemoteNode != null) {
      if (firstRemoteNode == null) {
        firstRemoteNode = newRemoteNode;
      }

      resolvedOldRemoteNode = placeChild(
        parentNode,
        childVNode,
        oldVNode,
        oldChildren,
        excessRemoteChildren,
        newRemoteNode,
        resolvedOldRemoteNode,
      );

      if (typeof newParentVNode.type === 'function') {
        // Because the newParentVNode is Fragment-like, we need to set it's
        // _nextDom property to the nextSibling of its last child DOM node.
        //
        // `resolvedOldRemoteNode` contains the correct value here because if the last child
        // is a Fragment-like, then resolvedOldRemoteNode has already been set to that child's _nextRemoteNode.
        // If the last child is a DOM VNode, then oldDom will be set to that DOM
        // node's nextSibling.
        newParentVNode._nextRemoteNode = resolvedOldRemoteNode!;
      }
    } else if (
      resolvedOldRemoteNode &&
      // eslint-disable-next-line eqeqeq
      oldVNode?._remoteNode == resolvedOldRemoteNode &&
      resolvedOldRemoteNode.parent !== parentNode
    ) {
      // The above condition is to handle null placeholders
      resolvedOldRemoteNode = getRemoteSibling(oldVNode);
    }
  }

  newParentVNode._remoteNode = firstRemoteNode!;

  // Remove children that are not part of any vnode.
  if (
    excessRemoteChildren != null &&
    typeof newParentVNode.type !== 'function'
  ) {
    for (let index = excessRemoteChildren.length; index--; ) {
      if (excessRemoteChildren[index] != null) {
        removeNode(excessRemoteChildren[index]!);
      }
    }
  }

  // Remove remaining oldChildren if there are any.
  for (let index = oldChildrenLength; index--; ) {
    const child = oldChildren[index];
    if (child != null) {
      unmount(child, child);
    }
  }

  // Set refs only after unmount
  if (refs) {
    for (const refEntry of refs) {
      applyRef(...refEntry);
    }
  }
}

export function placeChild(
  parentNode: RemoteParentNode,
  childVNode: VNode<any>,
  oldVNode: VNode<any> | null | undefined,
  oldChildren: (VNode<any> | null | undefined)[],
  excessRemoteChildren: (RemoteChildNode | null | undefined)[] | null,
  newRemoteNode: RemoteChildNode,
  oldRemoteNode: RemoteChildNode | null | undefined,
) {
  let nextRemoteNode: RemoteChildNode | null | undefined;

  if (childVNode._nextRemoteNode !== undefined) {
    // Only Fragments or components that return Fragment like VNodes will
    // have a non-undefined _nextRemoteNode. Continue the diff from the sibling
    // of last DOM child of this child VNode
    nextRemoteNode = childVNode._nextRemoteNode;

    // Eagerly cleanup _nextRemoteNode. We don't need to persist the value because
    // it is only used by `diffChildren` to determine where to resume the diff after
    // diffing Components and Fragments. Once we store it the nextRemoteNode local var, we
    // can clean up the property
    childVNode._nextRemoteNode = undefined;
  } else if (
    // eslint-disable-next-line eqeqeq
    excessRemoteChildren == oldVNode ||
    newRemoteNode !== oldRemoteNode ||
    newRemoteNode.parent == null
  ) {
    // NOTE: excessDomChildren==oldVNode above:
    // This is a compression of excessDomChildren==null && oldVNode==null!
    // The values only have the same type when `null`.

    // eslint-disable-next-line no-labels
    outer: if (oldRemoteNode == null || oldRemoteNode.parent !== parentNode) {
      parentNode.appendChild(newRemoteNode);
      nextRemoteNode = null;
    } else {
      // `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
      for (
        let siblingRemoteNode = oldRemoteNode, j = 0;
        (siblingRemoteNode = nextSiblingRemote(siblingRemoteNode)) &&
        j < oldChildren.length;
        j += 2
      ) {
        if (siblingRemoteNode === newRemoteNode) {
          // eslint-disable-next-line no-labels
          break outer;
        }
      }

      parentNode.insertChildBefore(newRemoteNode, oldRemoteNode);
      nextRemoteNode = oldRemoteNode;
    }
  }

  // If we have pre-calculated the nextDOM node, use it. Else calculate it now
  // Strictly check for `undefined` here cuz `null` is a valid value of `nextDom`.
  // See more detail in create-element.js:createVNode
  return nextRemoteNode === undefined
    ? nextSiblingRemote(newRemoteNode)
    : nextRemoteNode;
}

function nextSiblingRemote(node: RemoteChild<any>) {
  const {parent} = node;

  if (parent == null) return null;

  const parentChildren = parent.children;

  return parentChildren[parentChildren.indexOf(node) + 1] || null;
}
