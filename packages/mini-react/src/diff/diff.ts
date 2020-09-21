import {KIND_TEXT} from '@remote-ui/core';
import type {RemoteRoot, RemoteComponent, RemoteText} from '@remote-ui/core';

import {Component} from '../Component';
import {Fragment} from '../Fragment';
import options from '../options';
import type {
  VNode,
  Ref,
  RefObject,
  RemoteChildNode,
  RemoteParentNode,
  RemoteComponentNode,
  ComponentInternal,
  ComponentClass,
  FunctionComponent,
} from '../types';

import {diffChildren, placeChild} from './children';
import {diffProps} from './props';

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
      const contextType = (newType as ComponentClass<any>).contextType;
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
  // TODO
  vnode._remoteNode = undefined as any;
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
  remoteNode: RemoteChildNode | undefined,
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
