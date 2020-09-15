import type {RemoteChild, RemoteRoot} from '@remote-ui/core';
import {createVNode, Fragment} from '../create-element';
import {EMPTY_OBJ, EMPTY_ARR} from '../constants';
import type {
  ComponentChild,
  ComponentChildren,
  Context,
  ReactRemoteNode,
  VNode,
} from '../types';
import {removeNode} from '../util';
import {Component, getRemoteSibling} from '../component';
import {diff, unmount, applyRef} from './index';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentRemoteNode The DOM element whose
 * children are being diffed
 * @param {import('../index').ComponentChildren[]} renderResult
 * @param {import('../internal').VNode} newParentVNode The new virtual
 * node whose children should be diff'ed against oldParentVNode
 * @param {import('../internal').VNode} oldParentVNode The old virtual
 * node whose children should be diff'ed against newParentVNode
 * @param {object} globalContext The current context object - modified by getChildContext
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessRemoteChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {Node | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 */
export function diffChildren(
  parentNode: ReactRemoteNode,
  renderResult: ComponentChildren[],
  newParentVNode: VNode<any>,
  oldParentVNode: VNode<any> | null,
  globalContext: Context,
  excessRemoteChildren: RemoteChild<any>[] | null,
  commitQueue: Component[],
  oldRemoteNode: RemoteChild<any> | typeof EMPTY_OBJ | null,
  remoteRoot: RemoteRoot<any, any>,
) {
  let j;
  let newDom;
  let firstChildDom;
  let refs: any[] | undefined;

  // This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
  // as EMPTY_OBJ._children should be `undefined`.
  const oldChildren = oldParentVNode?._children ?? EMPTY_ARR;

  const oldChildrenLength = oldChildren.length;

  // Only in very specific places should this logic be invoked (top level `render` and `diffElementNodes`).
  // I'm using `EMPTY_OBJ` to signal when `diffChildren` is invoked in these situations. I can't use `null`
  // for this purpose, because `null` is a valid value for `oldRemoteNode` which can mean to skip to this logic
  // (e.g. if mounting a new tree in which the old DOM should be ignored (usually for Fragments).
  let normalizedOldRemoteNode: RemoteChild<any> | null = oldRemoteNode as any;
  if (oldRemoteNode === EMPTY_OBJ) {
    if (excessRemoteChildren != null) {
      normalizedOldRemoteNode = excessRemoteChildren[0];
    } else if (oldChildrenLength) {
      normalizedOldRemoteNode = getRemoteSibling(oldParentVNode!, 0);
    } else {
      normalizedOldRemoteNode = null;
    }
  }

  newParentVNode._children = [];

  for (const [index, rendered] of renderResult.entries()) {
    let childVNode: VNode<any> | null;

    if (rendered == null || typeof rendered === 'boolean') {
      childVNode = null;
    }
    // If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
    // or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
    // it's own DOM & etc. pointers
    else if (typeof rendered === 'string' || typeof rendered === 'number') {
      childVNode = createVNode(null, rendered, null, null, rendered);
    } else if (Array.isArray(rendered)) {
      childVNode = createVNode(
        Fragment,
        {children: rendered},
        null,
        null,
        null,
      );
    } else if (rendered._dom != null || rendered._component != null) {
      childVNode = createVNode(
        rendered.type,
        rendered.props,
        rendered.key,
        null,
        rendered._original,
      );
    } else {
      childVNode = rendered;
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
      for (j = 0; j < oldChildrenLength; j++) {
        oldVNode = oldChildren[j];
        // If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
        // We always match by type (in either case).
        if (
          oldVNode &&
          childVNode.key === oldVNode.key &&
          childVNode.type === oldVNode.type
        ) {
          oldChildren[j] = undefined;
          break;
        }
        oldVNode = null;
      }
    }

    // Morph the old element into the new one, but don't append it to the dom yet
    newDom = diff(
      parentNode,
      childVNode,
      oldVNode,
      globalContext,
      excessRemoteChildren,
      commitQueue,
      normalizedOldRemoteNode,
      remoteRoot,
    );

    const childRef = childVNode.ref;

    if (childRef && oldVNode?.ref !== j) {
      if (!refs) refs = [];
      if (oldVNode?.ref) refs.push(oldVNode.ref, null, childVNode);
      refs.push(childRef, childVNode._component ?? newDom, childVNode);
    }

    if (newDom != null) {
      if (firstChildDom == null) {
        firstChildDom = newDom;
      }

      normalizedOldRemoteNode = placeChild(
        parentNode,
        childVNode,
        oldVNode,
        oldChildren,
        excessRemoteChildren,
        newDom,
        normalizedOldRemoteNode,
      );

      if (typeof newParentVNode.type === 'function') {
        // Because the newParentVNode is Fragment-like, we need to set it's
        // _nextDom property to the nextSibling of its last child DOM node.
        //
        // `oldRemoteNode` contains the correct value here because if the last child
        // is a Fragment-like, then oldRemoteNode has already been set to that child's _nextDom.
        // If the last child is a DOM VNode, then oldRemoteNode will be set to that DOM
        // node's nextSibling.
        newParentVNode._nextDom = oldRemoteNode;
      }
    } else if (
      normalizedOldRemoteNode &&
      oldVNode?._dom === normalizedOldRemoteNode &&
      normalizedOldRemoteNode?.parent !== parentNode
    ) {
      // The above condition is to handle null placeholders. See test in placeholder.test.js:
      // `efficiently replace null placeholders in parent rerenders`
      normalizedOldRemoteNode = getRemoteSibling(oldVNode);
    }
  }

  newParentVNode._dom = firstChildDom;

  // Remove children that are not part of any vnode.
  if (
    excessRemoteChildren != null &&
    typeof newParentVNode.type !== 'function'
  ) {
    for (let i = excessRemoteChildren.length; i--; ) {
      if (excessRemoteChildren[i] != null) removeNode(excessRemoteChildren[i]);
    }
  }

  // Remove remaining oldChildren if there are any.
  for (let i = oldChildrenLength; i--; ) {
    if (oldChildren[i] != null) unmount(oldChildren[i]!, oldChildren[i]!);
  }

  // Set refs only after unmount
  if (refs) {
    for (let i = 0; i < refs.length; i++) {
      applyRef(refs[i], refs[++i], refs[++i]);
    }
  }
}

/**
 * Flatten and loop through the children of a virtual node
 */
export function toChildArray(
  children: ComponentChildren,
  out: ComponentChild[] = [],
) {
  if (Array.isArray(children)) {
    children.some((child) => {
      toChildArray(child, out);
    });
  } else if (children != null && typeof children !== 'boolean') {
    out.push(children);
  }
  return out;
}

export function placeChild(
  parentNode: ReactRemoteNode,
  childVNode: VNode<any>,
  oldVNode: VNode<any> | null | undefined,
  oldChildren: RemoteChild<any>[],
  excessRemoteChildren: RemoteChild<any>[] | null,
  newRemote: RemoteChild<any>,
  oldRemote: RemoteChild<any> | null,
) {
  let nextRemote: RemoteChild<any> | undefined | null;

  if (childVNode._nextDom !== undefined) {
    // Only Fragments or components that return Fragment like VNodes will
    // have a non-undefined _nextDom. Continue the diff from the sibling
    // of last DOM child of this child VNode
    nextRemote = childVNode._nextDom;

    // Eagerly cleanup _nextDom. We don't need to persist the value because
    // it is only used by `diffChildren` to determine where to resume the diff after
    // diffing Components and Fragments. Once we store it the nextDOM local var, we
    // can clean up the property
    childVNode._nextDom = undefined;
  } else if (
    excessRemoteChildren === oldVNode ||
    newRemote !== oldRemote ||
    newRemote.parent == null
  ) {
    // NOTE: excessRemoteChildren==oldVNode above:
    // This is a compression of excessRemoteChildren==null && oldVNode==null!
    // The values only have the same type when `null`.

    // eslint-disable-next-line no-labels
    outer: if (oldRemote == null || oldRemote.parent !== parentNode) {
      parentNode.appendChild(newRemote);
      nextRemote = null;
    } else {
      // `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
      for (
        let sibRemote: RemoteChild<any> | null = oldRemote, j = 0;
        (sibRemote = nextSiblingRemote(sibRemote)) && j < oldChildren.length;
        j += 2
      ) {
        if (sibRemote === newRemote) {
          // eslint-disable-next-line no-labels
          break outer;
        }
      }
      parentNode.insertChildBefore(newRemote, oldRemote);
      nextRemote = oldRemote;
    }
  }

  // If we have pre-calculated the nextRemote node, use it. Else calculate it now
  // Strictly check for `undefined` here cuz `null` is a valid value of `nextRemote`.
  // See more detail in create-element.js:createVNode
  return nextRemote === undefined ? nextSiblingRemote(newRemote) : nextRemote;
}

function nextSiblingRemote(node: RemoteChild<any>) {
  const {parent} = node;

  if (parent == null) return null;

  const parentChildren: RemoteChild<any>[] = parent.children;

  return parentChildren[parentChildren.indexOf(node) + 1] ?? null;
}
