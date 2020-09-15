import type {RemoteChild, RemoteRoot} from '@remote-ui/core';
import {assign} from './util';
import {diff, commitRoot} from './diff/index';
import options from './options';
import {Fragment} from './create-element';

import type {Component as ComponentType, VNode} from './types';

/**
 * Base Component class. Provides `setState()` and `forceUpdate()`, which
 * trigger rendering
 * @param {object} props The initial component props
 * @param {object} context The initial context from parent components'
 * getChildContext
 */
export class Component<P = {}, S = {}> implements ComponentType<P, S> {
  _renderCallbacks!: (() => void)[];
  _nextState?: S;
  _root!: RemoteRoot<any, any>;
  _vnode?: VNode<P>;
  _force?: boolean;
  _parentDom?: any;
  _globalContext!: any;
  _dirty!: boolean;
  state!: S;

  constructor(public props: any, public context: any) {}

  render({children}) {
    return children;
  }

  setState(update: S | ((state: S, props: P) => S | null), callback: any) {
    let currentState: S;
    if (this._nextState != null && this._nextState !== this.state) {
      currentState = this._nextState;
    } else {
      currentState = assign({}, this.state);
      this._nextState = currentState;
    }

    const finalUpdate: S | null =
      typeof update === 'function'
        ? (update as any)(assign({}, currentState), this.props)
        : update;

    if (finalUpdate) {
      assign(currentState, finalUpdate);
    }

    // Skip update if updater function returned null
    if (update == null) return;

    if (this._vnode) {
      if (callback) this._renderCallbacks.push(callback);
      enqueueRender(this);
    }
  }

  forceUpdate(callback: any) {
    if (this._vnode) {
      // Set render mode so that we can differentiate where the render request
      // is coming from. We need this because forceUpdate should never call
      // shouldComponentUpdate
      this._force = true;
      if (callback) this._renderCallbacks.push(callback);
      enqueueRender(this);
    }
  }
}

export function getRemoteSibling(
  vnode: VNode<any>,
  childIndex?: number,
): RemoteChild<any> | null {
  if (childIndex == null) {
    // Use childIndex==null as a signal to resume the search from the vnode's sibling
    return vnode._parent
      ? getRemoteSibling(
          vnode._parent,
          vnode._parent._children!.indexOf(vnode) + 1,
        )
      : null;
  }

  let sibling;
  let index = childIndex;
  for (; childIndex < vnode._children!.length; index++) {
    sibling = vnode._children![childIndex];

    if (sibling != null && sibling._dom != null) {
      // Since updateParentDomPointers keeps _dom pointer correct,
      // we can rely on _dom to tell us if this subtree contains a
      // rendered DOM node, and what the first rendered DOM node is
      return sibling._dom;
    }
  }

  // If we get here, we have not found a DOM node in this vnode's children.
  // We must resume from this vnode's sibling (in it's parent _children array)
  // Only climb up and search the parent if we aren't searching through a DOM
  // VNode (meaning we reached the DOM parent of the original vnode that began
  // the search)
  return typeof vnode.type === 'function' ? getRemoteSibling(vnode) : null;
}

/**
 * Trigger in-place re-rendering of a component.
 */
function renderComponent(component: Component) {
  const vnode = component._vnode!;
  const oldDom = vnode._dom;
  const parentDom = component._parentDom;

  if (parentDom) {
    const commitQueue: Component[] = [];
    const oldVNode = assign({}, vnode);
    oldVNode._original = oldVNode;

    const newDom = diff(
      parentDom,
      vnode,
      oldVNode,
      component._globalContext,
      null,
      commitQueue,
      oldDom == null ? getRemoteSibling(vnode) : oldDom,
      component._root,
    );

    commitRoot(commitQueue, vnode);

    if (newDom !== oldDom) {
      updateParentDomPointers(vnode);
    }
  }
}

/**
 * @param {import('./internal').VNode} vnode
 */
function updateParentDomPointers(vnode: VNode<any>): void {
  const parent = vnode._parent;

  if (parent != null && parent._component != null) {
    vnode._dom = null;
    vnode._component.base = null;

    for (const child of parent._children!) {
      if (child != null && child._dom != null) {
        parent._dom = child._dom;
        parent._component.base = child._dom;
        break;
      }
    }

    updateParentDomPointers(parent);
  }
}

let rerenderQueue: Component[] = [];

const defer: (callback: () => void) => void =
  typeof Promise === 'function'
    ? Promise.prototype.then.bind(Promise.resolve())
    : setTimeout;

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistently reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */

let prevDebounce: typeof defer | undefined;

/**
 * Enqueue a rerender of a component
 */
export function enqueueRender(c: Component<any, any>) {
  if (
    (!c._dirty &&
      (c._dirty = true) &&
      rerenderQueue.push(c) &&
      !process._rerenderCount++) ||
    prevDebounce !== options.debounceRendering
  ) {
    prevDebounce = options.debounceRendering;
    (prevDebounce || defer)(process);
  }
}

/** Flush the render queue by rerendering all queued components */
function process() {
  let queue;
  while ((process._rerenderCount = rerenderQueue.length)) {
    queue = rerenderQueue.sort(
      (componentA, componentB) =>
        componentA._vnode!._depth - componentB._vnode!._depth,
    );
    rerenderQueue = [];
    // Don't update `renderCount` yet. Keep its value non-zero to prevent unnecessary
    // process() calls from getting scheduled while `queue` is still being consumed.
    queue.some((c) => {
      if (c._dirty) renderComponent(c);
    });
  }
}
process._rerenderCount = 0;
