import {KIND_TEXT} from '@remote-ui/core';
import type {
  RemoteRoot,
  RemoteComponent,
  RemoteText,
  RemoteChild,
} from '@remote-ui/core';

import {Fragment} from '../Fragment';
import {createVNode} from '../create-element';
import {EMPTY_ARRAY} from '../constants';
import {removeNode} from '../utilities';
import options from '../options';
import type {
  VNode,
  Ref,
  Options,
  RefObject,
  RemoteChildNode,
  RemoteParentNode,
  RemoteComponentNode,
  ComponentInternal,
  ComponentClass,
  FunctionComponent,
  ContextInternal,
  ComponentChildren,
  RemoteRootNode,
  Component as ComponentInstance,
  RenderableProps,
} from '../types';

import {diffProps} from './props';

// In Preact, this is in a separate, top level ./Components.js file. This causes
// issues because `Component` needs to depend on `diff()`, and `diff()` needs to
// depend on `Component`. For simplicity, I just plunked all the contents in the
// same file.
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
    const internalThis = this as any as ComponentInternal<P, S>;

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
    const internalThis = this as any as ComponentInternal<P, S>;

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

function getRemoteSibling(
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
 * Diff two virtual nodes and apply proper changes to a remote node
 */
export function diff(
  parentNode: RemoteParentNode,
  remoteRoot: RemoteRoot<any, any>,
  newVNode: VNode<any>,
  oldVNode: VNode<any> | undefined,
  globalContext: any,
  excessRemoteChildren: (RemoteChildNode | null | undefined)[] | null,
  commitQueue: ComponentInternal<any, any>[],
  oldRemoteNode?: RemoteChildNode | null,
) {
  const newType = newVNode.type;

  // When passing through createElement it assigns the object
  // constructor as undefined. This to prevent JSON-injection.
  if (newVNode.constructor !== undefined) return null;

  options._diff?.(newVNode);

  try {
    // eslint-disable-next-line no-labels
    outer: if (typeof newType === 'function') {
      let isNew = false;
      let clearProcessingException: ComponentInternal<
        any,
        any
      >['_pendingError'];

      let component: ComponentInternal<any, any>;
      const oldComponent = oldVNode?._component;

      const newProps = newVNode.props;

      // Necessary for createContext api. Setting this property will pass
      // the context value as `this.context` just for this component.
      const contextType = (newType as ComponentClass<any>)
        .contextType as ContextInternal<any>;

      const provider = contextType && globalContext[contextType._id];
      // eslint-disable-next-line no-nested-ternary
      const componentContext = contextType
        ? provider
          ? provider.props.value
          : contextType._defaultValue
        : globalContext;

      if (oldComponent) {
        component = oldComponent;
        newVNode._component = component;
        clearProcessingException = component._pendingError;
        component._processingException = component._pendingError;
      } else {
        // Instantiate the new component
        if ('prototype' in newType && newType.prototype.render) {
          component = new (newType as any)(newProps, componentContext);
        } else {
          component = new Component(newProps, componentContext) as any;
          component.constructor = newType;
          component.render = doRender;
        }

        newVNode._component = component;

        if (provider) provider.sub(component);

        component.props = newProps;
        if (!component.state) component.state = {};
        component.context = componentContext;
        component._globalContext = globalContext;
        component._remoteRoot = remoteRoot;
        component._dirty = true;
        component._renderCallbacks = [];

        isNew = true;
      }

      // Invoke getDerivedStateFromProps
      if (component._nextState == null) {
        component._nextState = component.state;
      }

      if ((newType as ComponentClass<any>).getDerivedStateFromProps != null) {
        // Clone state to _nextState because we are about to assign new
        // state values to _nextState and we don’t want it to be visible
        // on state
        if (component._nextState === component.state) {
          component._nextState = {...component._nextState};
        }

        Object.assign(
          component._nextState,
          (newType as ComponentClass<any>).getDerivedStateFromProps!(
            newProps,
            component._nextState,
          ),
        );
      }

      let snapshot: any;
      const {props: oldProps, state: oldState} = component;

      // Invoke pre-render lifecycle methods
      if (isNew) {
        if (
          (newType as ComponentClass<any>).getDerivedStateFromProps == null &&
          component.componentWillMount != null
        ) {
          component.componentWillMount();
        }

        if (component.componentDidMount != null) {
          component._renderCallbacks.push(component.componentDidMount);
        }
      } else {
        if (
          (newType as ComponentClass<any>).getDerivedStateFromProps == null &&
          newProps !== oldProps &&
          component.componentWillReceiveProps != null
        ) {
          component.componentWillReceiveProps(newProps, componentContext);
        }

        if (
          (!component._force &&
            component.shouldComponentUpdate != null &&
            component.shouldComponentUpdate(
              newProps,
              component._nextState,
              componentContext,
            ) === false) ||
          newVNode._original === oldVNode?._original
        ) {
          component.props = newProps;
          component.state = component._nextState;

          // More info about this here: https://gist.github.com/JoviDeCroock/bec5f2ce93544d2e6070ef8e0036e4e8
          if (newVNode._original !== oldVNode!._original) {
            component._dirty = false;
          }

          component._vnode = newVNode;
          newVNode._remoteNode = oldVNode!._remoteNode;
          newVNode._children = oldVNode!._children;

          if (component._renderCallbacks.length) {
            commitQueue.push(component);
          }

          reorderChildren(
            newVNode,
            oldRemoteNode as RemoteComponentNode,
            parentNode,
          );

          // eslint-disable-next-line no-labels
          break outer;
        }

        if (component.componentWillUpdate != null) {
          component.componentWillUpdate(
            newProps,
            component._nextState,
            componentContext,
          );
        }

        if (component.componentDidUpdate != null) {
          component._renderCallbacks.push(() => {
            component.componentDidUpdate!(oldProps, oldState, snapshot);
          });
        }
      }

      component.context = componentContext;
      component.props = newProps;
      component.state = component._nextState;

      options._render?.(newVNode);

      component._dirty = false;
      component._vnode = newVNode;
      component._parentRemoteNode = parentNode;

      const renderResult = component.render(
        component.props,
        component.state,
        component.context,
      );

      const normalizedRenderResult =
        renderResult == null ||
        (renderResult as any).type !== Fragment ||
        (renderResult as any).key != null
          ? renderResult
          : (renderResult as VNode<any>).props.children;

      // Handle setState called in render
      component.state = component._nextState;

      const newContext =
        component.getChildContext == null
          ? globalContext
          : {...globalContext, ...component.getChildContext()};

      if (!isNew && component.getSnapshotBeforeUpdate != null) {
        snapshot = component.getSnapshotBeforeUpdate(oldProps, oldState);
      }

      diffChildren(
        parentNode,
        remoteRoot,
        Array.isArray(normalizedRenderResult)
          ? normalizedRenderResult
          : [normalizedRenderResult],
        newVNode,
        oldVNode,
        newContext,
        excessRemoteChildren,
        commitQueue,
        oldRemoteNode,
      );

      component.base = newVNode._remoteNode!;

      if (component._renderCallbacks.length) {
        commitQueue.push(component);
      }

      if (clearProcessingException) {
        component._pendingError = null;
        component._processingException = null;
      }

      component._force = false;
    } else if (
      excessRemoteChildren == null &&
      newVNode._original === oldVNode?._original
    ) {
      newVNode._children = oldVNode._children;
      newVNode._remoteNode = oldVNode._remoteNode;
    } else {
      newVNode._remoteNode = diffElementNodes(
        oldVNode?._remoteNode,
        remoteRoot,
        newVNode,
        oldVNode!,
        globalContext,
        excessRemoteChildren,
        commitQueue,
      );
    }

    options.diffed?.(newVNode);
  } catch (error) {
    newVNode._original = null;

    // if creating initial tree, bailout preserves DOM:
    if (excessRemoteChildren != null) {
      newVNode._remoteNode = oldRemoteNode!;
      excessRemoteChildren[excessRemoteChildren.indexOf(oldRemoteNode!)] = null;
    }

    options._catchError(error, newVNode, oldVNode);
  }

  return newVNode._remoteNode;
}

export function commitRoot(
  commitQueue: ComponentInternal<any, any>[],
  vnode: VNode<any>,
) {
  options._commit?.(vnode, commitQueue);

  commitQueue.forEach((component) => {
    try {
      const renderCallbacks = component._renderCallbacks;
      component._renderCallbacks = [];

      renderCallbacks.forEach((cb) => {
        cb.call(component);
      });
    } catch (error) {
      options._catchError(error, component._vnode!);
    }
  });
}

/**
 * Unmount a virtual node from the tree and apply changes to the remote tree
 */
export function unmount(
  vnode: VNode<any>,
  parentVNode: VNode<any>,
  skipRemove = false,
) {
  options.unmount?.(vnode);

  const {ref, type, _component: component, _children: children} = vnode;
  let finalSkipRemove = skipRemove;
  let remoteNode: RemoteChildNode | null | undefined;

  if (ref) {
    if (
      !(ref as RefObject<any>).current ||
      (ref as RefObject<any>).current === vnode._remoteNode
    ) {
      applyRef(ref, null, parentVNode);
    }
  }

  if (!skipRemove && typeof type !== 'function') {
    remoteNode = vnode._remoteNode;
    finalSkipRemove = remoteNode != null;
  }

  // Must be set to `undefined` to properly clean up `_nextRemoteNode`
  // for which `null` is a valid value. See comment in `create-element.js`
  vnode._remoteNode = undefined;
  vnode._nextRemoteNode = undefined;

  if (component != null) {
    if (component.componentWillUnmount) {
      try {
        component.componentWillUnmount();
      } catch (error) {
        options._catchError(error, parentVNode);
      }
    }

    component.base = null;
    component._parentRemoteNode = null;
  }

  if (children) {
    for (const child of children) {
      if (child) unmount(child, parentVNode, finalSkipRemove);
    }
  }

  remoteNode?.parent?.removeChild(remoteNode);
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {*} excessRemoteChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @returns {import('../internal').PreactElement}
 */
function diffElementNodes(
  remoteNode: RemoteChildNode | undefined | null,
  remoteRoot: RemoteRoot<any, any>,
  newVNode: VNode<any>,
  oldVNode: VNode<any> | undefined,
  globalContext: any,
  excessChildren: (RemoteChildNode | null | undefined)[] | null,
  commitQueue: ComponentInternal<any, any>[],
) {
  const oldProps = oldVNode?.props;
  const newProps = newVNode.props;
  let resolvedRemoteNode = remoteNode;
  let resolvedExcessChildren = excessChildren;

  if (excessChildren != null) {
    for (const child of excessChildren) {
      // if newVNode matches an element in excessRemoteChildren or the `dom`
      // argument matches an element in excessRemoteChildren, remove it from
      // excessRemoteChildren so it isn't later removed in diffChildren
      if (
        child != null &&
        ((newVNode.type === null
          ? child.kind === KIND_TEXT
          : (child as RemoteComponent<any, any>).type === newVNode.type) ||
          remoteNode === child)
      ) {
        resolvedRemoteNode = child;
        excessChildren[excessChildren.indexOf(child)] = null;
        break;
      }
    }
  }

  if (resolvedRemoteNode == null) {
    if (newVNode.type === null) {
      return remoteRoot.createText(newProps);
    }

    resolvedRemoteNode = remoteRoot.createComponent(newVNode.type);
    // we created a new parent, so none of the previously attached children can be reused:
    resolvedExcessChildren = null;
  }

  if (newVNode.type === null) {
    if (
      oldProps !== newProps &&
      (resolvedRemoteNode as RemoteText<any>).text !== newProps
    ) {
      (resolvedRemoteNode as RemoteText<any>).updateText(newProps);
    }
  } else {
    resolvedRemoteNode = resolvedRemoteNode as RemoteComponentNode;

    if (excessChildren != null) {
      resolvedExcessChildren = [...resolvedRemoteNode.children];
    }

    diffProps(resolvedRemoteNode, newProps, oldProps ?? {});

    const {children} = newProps;

    diffChildren(
      resolvedRemoteNode,
      remoteRoot,
      Array.isArray(children) ? children : [children],
      newVNode,
      oldVNode,
      globalContext,
      resolvedExcessChildren,
      commitQueue,
    );
  }

  return resolvedRemoteNode;
}

export function applyRef<T>(ref: Ref<T>, value: T, vnode: VNode<any>) {
  try {
    if (typeof ref === 'function') {
      ref(value);
    } else {
      ref.current = value;
    }
  } catch (error) {
    options._catchError(error, vnode);
  }
}

function reorderChildren(
  newVNode: VNode<any>,
  oldRemoteNode: RemoteChildNode,
  parentRemoteNode: RemoteParentNode,
) {
  for (const vnode of newVNode._children!) {
    if (vnode == null) continue;

    vnode._parent = newVNode;

    if (vnode._remoteNode) {
      if (typeof vnode.type === 'function' && vnode._children!.length > 1) {
        reorderChildren(vnode, oldRemoteNode, parentRemoteNode);
      }

      const updatedRemoteNode = placeChild(
        parentRemoteNode,
        vnode,
        vnode,
        newVNode._children!,
        null,
        vnode._remoteNode,
        oldRemoteNode,
      );

      if (typeof newVNode.type === 'function') {
        newVNode._nextRemoteNode = updatedRemoteNode;
      }
    }
  }
}

/** The `.render()` method for a PFC backing instance. */
function doRender(
  this: {constructor: FunctionComponent<any>},
  props: any,
  _state: any,
  context: any,
) {
  return this.constructor(props, context);
}

/**
 * Diff the children of a virtual node.
 */
function diffChildren(
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

function placeChild(
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
