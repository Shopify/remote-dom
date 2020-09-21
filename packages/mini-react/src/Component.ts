import {diff, commitRoot} from './diff';
import options from './options';
import type {
  VNode,
  Options,
  RemoteChildNode,
  Component as ComponentInstance,
  ComponentInternal,
  RenderableProps,
} from './types';

export class Component<P = {}, S = {}> implements ComponentInstance<P, S> {
  readonly state!: S;

  constructor(public props: P, public context: any) {}

  setState<K extends keyof S>(
    update:
      | ((
          prevState: Readonly<S>,
          props: Readonly<P>,
        ) => Pick<S, K> | Partial<S> | null)
      | (Pick<S, K> | Partial<S> | null),
    callback?: () => void,
  ) {
    const internalThis = (this as any) as ComponentInternal<P, S>;

    // only clone state when copying to nextState the first time.
    let state: S | undefined;

    const {state: currentState, _nextState: nextState} = internalThis;

    if (nextState != null && nextState !== currentState) {
      state = nextState;
    } else {
      state = {...currentState};
      internalThis._nextState = state;
    }

    const resolvedUpdate =
      typeof update === 'function'
        ? update({...state}, internalThis.props)
        : update;

    if (resolvedUpdate) {
      Object.assign(state, resolvedUpdate);
    }

    // Skip update if updater function returned null
    if (resolvedUpdate == null) return;

    if (internalThis._vnode) {
      if (callback) internalThis._renderCallbacks.push(callback);
      enqueueRender(internalThis);
    }
  }

  forceUpdate(callback?: () => void) {
    const internalThis = (this as any) as ComponentInternal<P, S>;

    if (internalThis._vnode) {
      // Set render mode so that we can differentiate where the render request
      // is coming from. We need this because forceUpdate should never call
      // shouldComponentUpdate
      internalThis._force = true;
      if (callback) internalThis._renderCallbacks.push(callback);
      enqueueRender(internalThis);
    }
  }

  render({children}: RenderableProps<P>) {
    return children;
  }
}

export function getRemoteSibling(
  vnode: VNode<any>,
  childIndex?: number,
): RemoteChildNode | null {
  if (childIndex == null) {
    // Use childIndex==null as a signal to resume the search from the vnode's sibling
    return vnode._parent
      ? getRemoteSibling(
          vnode._parent!,
          vnode._parent!._children!.indexOf(vnode) + 1,
        )
      : null;
  }

  for (const sibling of vnode._children!) {
    if (sibling?._remoteNode != null) {
      // Since updateParentDomPointers keeps _dom pointer correct,
      // we can rely on _dom to tell us if this subtree contains a
      // rendered DOM node, and what the first rendered DOM node is
      return sibling._remoteNode;
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
function renderComponent(component: ComponentInternal<any, any>) {
  const vnode = component._vnode!;
  const oldRemoteNode = vnode!._remoteNode;
  const parentRemoteNode = component._parentRemoteNode;

  if (parentRemoteNode) {
    const commitQueue: ComponentInternal<any, any>[] = [];
    const oldVNode = {...vnode};
    oldVNode._original = oldVNode;

    const newRemoteNode = diff(
      parentRemoteNode,
      component._remoteRoot,
      vnode,
      oldVNode,
      component._globalContext,
      [],
      commitQueue,
      oldRemoteNode == null ? getRemoteSibling(vnode) : oldRemoteNode,
    );

    commitRoot(commitQueue, vnode);

    if (newRemoteNode !== oldRemoteNode) {
      updateRemoteNodePointers(vnode);
    }
  }
}

function updateRemoteNodePointers(vnode: VNode<any>) {
  const parentVNode = vnode._parent;
  const parentComponent = parentVNode?._component;

  if (parentVNode != null && parentComponent != null) {
    parentVNode._remoteNode = null;
    parentComponent.base = undefined;

    for (const child of parentVNode._children!) {
      if (child?._remoteNode != null) {
        const newRemoteNode = child._remoteNode;

        parentVNode._remoteNode = newRemoteNode;
        parentComponent.base = newRemoteNode;

        break;
      }
    }

    updateRemoteNodePointers(parentVNode);
  }
}

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
 */
let rerenderQueue: ComponentInternal<any, any>[] = [];

const defer =
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

let prevDebounce: Options['debounceRendering'] | undefined;

export function enqueueRender(component: ComponentInternal<any, any>) {
  let shouldProcess = false;

  if (component._dirty) {
    shouldProcess = prevDebounce !== options.debounceRendering;
  } else {
    component._dirty = true;
    rerenderQueue.push(component);
    // We only want to process if we aren’t already in the middle of consuming
    // the current render queue
    shouldProcess = process._rerenderCount === 0;
    process._rerenderCount += 1;
  }

  if (shouldProcess) {
    prevDebounce = options.debounceRendering;
    (prevDebounce ?? defer)(process);
  }
}

/** Flush the render queue by rerendering all queued components */
function process() {
  let queue: ComponentInternal<any, any>[];

  while ((process._rerenderCount = rerenderQueue.length)) {
    queue = rerenderQueue.sort(
      (componentA, componentB) =>
        // We know _vnode is defined here because only components that have
        // actually rendered can be rerendered.
        componentA._vnode!._depth - componentB._vnode!._depth,
    );

    rerenderQueue = [];

    // Don't update `renderCount` yet. Keep its value non-zero to prevent unnecessary
    // process() calls from getting scheduled while `queue` is still being consumed.
    queue.forEach((component) => {
      if (component._dirty) renderComponent(component);
    });
  }
}
process._rerenderCount = 0;
