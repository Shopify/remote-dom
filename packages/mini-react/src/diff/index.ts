/* eslint no-labels: off */

import {KIND_COMPONENT, KIND_TEXT} from '@remote-ui/core';
import type {RemoteChild, RemoteRoot} from '@remote-ui/core';

import {EMPTY_OBJ} from '../constants';
import {Component} from '../component';
import {Fragment} from '../create-element';
import {assign, removeNode} from '../util';
import options from '../options';
import type {
  ReactRemoteNode,
  VNode,
  Context,
  ComponentClass,
  FunctionComponent,
  Ref,
} from '../types';

import {diffChildren, placeChild} from './children';
import {diffProps} from './props';

function reorderChildren(newVNode: VNode<any>, oldDom, parentDom) {
  for (const vnode of newVNode._children) {
    if (!vnode) continue;

    vnode._parent = newVNode;

    if (vnode._dom) {
      if (typeof vnode.type === 'function' && vnode._children.length > 1) {
        reorderChildren(vnode, oldDom, parentDom);
      }

      const updatedDom = placeChild(
        parentDom,
        vnode,
        vnode,
        newVNode._children,
        null,
        vnode._dom,
        oldDom,
      );

      if (typeof newVNode.type === 'function') {
        newVNode._nextDom = updatedDom;
      }
    }
  }
}

/**
 * Diff two virtual nodes and apply proper changes to the remote-ui tree.
 */
export function diff(
  parentNode: ReactRemoteNode,
  newVNode: VNode,
  oldVNode: VNode | null | undefined,
  globalContext: Context,
  excessDomChildren: RemoteChild<any>[] | null,
  commitQueue: Component[],
  oldDom,
  remoteRoot: RemoteRoot<any, any>,
) {
  let tmp;
  const newType = newVNode.type;

  // When passing through createElement it assigns the object
  // constructor as undefined. This to prevent JSON-injection.
  if (newVNode.constructor !== undefined) return null;

  options._diff?.(newVNode);

  try {
    outer: if (typeof newType === 'function') {
      let c: Component;

      let isNew;
      let oldProps;
      let oldState;
      let snapshot;
      let clearProcessingException;
      const newProps = newVNode.props;

      // Necessary for createContext api. Setting this property will pass
      // the context value as `this.context` just for this component.
      const contextType =
        'contextType' in newType ? newType.contextType : undefined;
      const provider = contextType && globalContext[contextType._id];

      // eslint-disable-next-line no-nested-ternary
      const componentContext = contextType
        ? provider
          ? provider.props.value
          : contextType._defaultValue
        : globalContext;

      // Get component and set it to `c`
      if (oldVNode?._component) {
        c = oldVNode._component;
        newVNode._component = c;
        clearProcessingException = c._processingException = c._pendingError;
      } else {
        // Instantiate the new component
        if ('prototype' in newType && newType.prototype.render) {
          c = new (newType as ComponentClass)(newProps, componentContext);
        } else {
          c = new Component(newProps, componentContext);
          c.constructor = newType;
          c.render = doRender;
        }

        newVNode._component = c;

        provider?.sub(c);

        c.props = newProps;
        if (!c.state) c.state = {};
        c.context = componentContext;
        c._globalContext = globalContext;
        c._dirty = true;
        c._root = remoteRoot;
        isNew = true;
        c._renderCallbacks = [];
      }

      // Invoke getDerivedStateFromProps
      if (c._nextState == null) {
        c._nextState = c.state;
      }

      if (newType.getDerivedStateFromProps != null) {
        if (c._nextState == c.state) {
          c._nextState = assign({}, c._nextState);
        }

        assign(
          c._nextState,
          newType.getDerivedStateFromProps(newProps, c._nextState),
        );
      }

      oldProps = c.props;
      oldState = c.state;

      // Invoke pre-render lifecycle methods
      if (isNew) {
        if (
          newType.getDerivedStateFromProps == null &&
          c.componentWillMount != null
        ) {
          c.componentWillMount();
        }

        if (c.componentDidMount != null) {
          c._renderCallbacks.push(c.componentDidMount);
        }
      } else {
        if (
          newType.getDerivedStateFromProps == null &&
          newProps !== oldProps &&
          c.componentWillReceiveProps != null
        ) {
          c.componentWillReceiveProps(newProps, componentContext);
        }

        if (
          (!c._force &&
            c.shouldComponentUpdate != null &&
            c.shouldComponentUpdate(
              newProps,
              c._nextState,
              componentContext,
            ) === false) ||
          newVNode._original === oldVNode?._original
        ) {
          c.props = newProps;
          c.state = c._nextState;
          // More info about this here: https://gist.github.com/JoviDeCroock/bec5f2ce93544d2e6070ef8e0036e4e8
          if (newVNode._original !== oldVNode._original) c._dirty = false;
          c._vnode = newVNode;
          newVNode._dom = oldVNode._dom;
          newVNode._children = oldVNode._children;
          if (c._renderCallbacks.length) {
            commitQueue.push(c);
          }

          reorderChildren(newVNode, oldDom, parentNode);
          break outer;
        }

        if (c.componentWillUpdate != null) {
          c.componentWillUpdate(newProps, c._nextState, componentContext);
        }

        if (c.componentDidUpdate != null) {
          c._renderCallbacks.push(() => {
            c.componentDidUpdate(oldProps, oldState, snapshot);
          });
        }
      }

      c.context = componentContext;
      c.props = newProps;
      c.state = c._nextState;

      options._render?.(newVNode);

      c._dirty = false;
      c._vnode = newVNode;
      c._parentDom = parentNode;

      tmp = c.render(c.props, c.state, c.context);

      // Handle setState called in render, see #2553
      c.state = c._nextState;

      if (c.getChildContext != null) {
        globalContext = assign(assign({}, globalContext), c.getChildContext());
      }

      if (!isNew && c.getSnapshotBeforeUpdate != null) {
        snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
      }

      const isTopLevelFragment =
        tmp != null && tmp.type === Fragment && tmp.key == null;
      const renderResult = isTopLevelFragment ? tmp.props.children : tmp;

      diffChildren(
        parentNode,
        Array.isArray(renderResult) ? renderResult : [renderResult],
        newVNode,
        oldVNode,
        globalContext,
        excessDomChildren,
        commitQueue,
        oldDom,
        remoteRoot,
      );

      c.base = newVNode._dom;

      if (c._renderCallbacks.length) {
        commitQueue.push(c);
      }

      if (clearProcessingException) {
        c._pendingError = c._processingException = null;
      }

      c._force = false;
    } else if (
      excessDomChildren == null &&
      newVNode._original === oldVNode?._original
    ) {
      newVNode._children = oldVNode._children;
      newVNode._dom = oldVNode._dom;
    } else {
      newVNode._dom = diffElementNodes(
        oldVNode?._dom,
        newVNode,
        oldVNode,
        globalContext,
        excessDomChildren,
        commitQueue,
        remoteRoot,
      );
    }

    if ((tmp = options.diffed)) tmp(newVNode);
  } catch (e) {
    newVNode._original = null;
    options._catchError(e, newVNode, oldVNode);
  }

  return newVNode._dom;
}

export function commitRoot(commitQueue: Component[], root: VNode<any>) {
  options._commit?.(root, commitQueue);

  commitQueue.some((component) => {
    try {
      const renderFallbacks = component._renderCallbacks;
      component._renderCallbacks = [];
      renderFallbacks.some((callback) => {
        callback.call(component);
      });
    } catch (error) {
      options._catchError(error, component._vnode);
    }
  });
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {*} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @returns {import('../internal').PreactElement}
 */
function diffElementNodes(
  remoteNode: RemoteChild<any> | undefined,
  newVNode: VNode<any>,
  oldVNode: VNode<any> | null | undefined,
  globalContext: Context,
  excessRemoteChildren: (RemoteChild<any> | null)[] | null,
  commitQueue: Component[],
  remoteRoot: RemoteRoot<any, any>,
) {
  let i;
  let oldProps = oldVNode?.props;
  let node = remoteNode;
  const newProps = newVNode.props;

  if (excessRemoteChildren != null) {
    for (i = 0; i < excessRemoteChildren.length; i++) {
      const child = excessRemoteChildren[i];

      // if newVNode matches an element in excessRemoteChildren or the `remoteNode`
      // argument matches an element in excessRemoteChildren, remove it from
      // excessRemoteChildren so it isn't later removed in diffChildren
      if (
        child != null &&
        ((newVNode.type === null
          ? child.kind === KIND_TEXT
          : child.kind === KIND_COMPONENT && child.type === newVNode.type) ||
          remoteNode === child)
      ) {
        node = child;
        excessRemoteChildren[i] = null;
        break;
      }
    }
  }

  if (node == null) {
    if (newVNode.type === null) {
      return remoteRoot.createText(newProps);
    }

    node = remoteRoot.createComponent(newVNode.type);
    // we created a new parent, so none of the previously attached children can be reused:
    excessRemoteChildren = null;
  }

  if (newVNode.type === null) {
    if (oldProps !== newProps && node.text !== newProps) {
      node.updateText(newProps);
    }
  } else {
    if (excessRemoteChildren != null) {
      excessRemoteChildren = [...node.children];
    }

    oldProps = oldVNode?.props ?? EMPTY_OBJ;

    // During hydration, props are not diffed at all (including dangerouslySetInnerHTML)
    // @TODO we should warn in debug mode when props don't match here.
    // if (!isHydrating) {
    // But, if we are in a situation where we are using existing DOM (e.g. replaceNode)
    // we should read the existing DOM attributes to diff them
    if (excessRemoteChildren != null) {
      oldProps = node.props;
    }
    // }

    diffProps(node, newProps, oldProps);

    i = newVNode.props.children;
    diffChildren(
      node,
      Array.isArray(i) ? i : [i],
      newVNode,
      oldVNode,
      globalContext,
      excessRemoteChildren,
      commitQueue,
      EMPTY_OBJ,
      remoteRoot,
    );
  }

  return node;
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 */
export function applyRef<T>(ref: Ref<T>, value: T, vnode: VNode<any>) {
  try {
    if (typeof ref === 'function') ref(value);
    else ref.current = value;
  } catch (error) {
    options._catchError(error, vnode);
  }
}

/**
 * Unmount a virtual node from the tree and apply DOM changes
 */
export function unmount(
  vnode: VNode<any>,
  parentVNode: VNode<any>,
  skipRemove?: boolean,
) {
  options.unmount?.(vnode);

  const {ref} = vnode;
  if (ref) {
    const current = 'current' in ref ? ref.current : null;
    if (!current || current === vnode._dom) applyRef(ref, null, parentVNode);
  }

  let dom;
  if (!skipRemove && typeof vnode.type !== 'function') {
    dom = vnode._dom;
    skipRemove = dom != null;
  }

  // Must be set to `undefined` to properly clean up `_nextDom`
  // for which `null` is a valid value. See comment in `create-element.js`
  vnode._dom = undefined;
  vnode._nextDom = undefined;

  const component = vnode._component;
  if (component != null) {
    if (component.componentWillUnmount != null) {
      try {
        component.componentWillUnmount();
      } catch (error) {
        options._catchError(error, parentVNode);
      }
    }

    component.base = null;
    component._parentDom = null;
  }

  const children = vnode._children;
  if (children) {
    for (const child of children) {
      unmount(child, parentVNode, skipRemove);
    }
  }

  if (dom != null) removeNode(dom);
}

/** The `.render()` method for a PFC backing instance. */
function doRender<P>(
  this: FunctionComponent<P>,
  props: P,
  _state: any,
  context: any,
) {
  return this.constructor(props, context);
}
