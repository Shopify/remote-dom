import {createRemoteRoot} from '@remote-ui/core';
import type {RemoteRoot} from '@remote-ui/core';
import {Component, render} from '@remote-ui/mini-react';
import type {ComponentChild, VNode} from '@remote-ui/mini-react';

import {createEnvironment} from '@quilted/react-testing/environment';
import type {
  CustomMount,
  Environment,
} from '@quilted/react-testing/environment';

import {act, setupRerender, teardown} from './act';

export {act, setupRerender, teardown};

interface Context {
  root: RemoteRoot<any, any>;
}

export type {CustomMount};

const {mount, createMount, mounted, unmountAll} = createEnvironment<Context>({
  act: act as any,
  mount(tree) {
    const root = createRemoteRoot(() => {});

    render(tree, root);

    return {root};
  },
  unmount({element}) {
    render(null, element);
    element.remove();
  },
  update(instance, create) {
    return createNodeFromComponentChild(getVNode(instance), create) as any;
  },
});

export {mount, createMount, mounted, unmountAll};

type Create = Parameters<Environment<any, {}>['update']>[1];
type Child = ReturnType<Create> | string;

function createNodeFromComponentChild(
  child: ComponentChild,
  create: Create,
): Child {
  if (isTextNode(child)) {
    return child.props;
  }

  if (isVNode(child)) {
    return createNodeFromVNode(child, create);
  }

  return (child as any)?.toString() as any;
}

function createNodeFromVNode(node: VNode<unknown>, create: Create): Child {
  const props = {...node.props};
  const instance = getComponent(node) ?? getDOMNode(node);
  const children = toArray(getDescendants(node))
    .filter(Boolean)
    .map((child) => createNodeFromComponentChild(child, create));

  return create({
    props,
    children,
    instance,
    type: node.type as any,
  });
}

function isVNode(maybeNode: ComponentChild): maybeNode is VNode<unknown> {
  return (
    typeof maybeNode === 'object' &&
    maybeNode != null &&
    Reflect.has(maybeNode, 'props')
  );
}

/**
 * Preact mangles it's private internals, these types help us access them safely(ish)
 * See https://github.com/preactjs/preact/blob/master/mangle.json
 */

interface PreactComponent<P> extends Component<P> {
  __v: VNode;
}

interface PreactVNode<P> extends VNode<P> {
  // the DOM node
  __e: typeof window['Node'] | null;

  // the component instance
  __c: PreactComponent<P> | null;

  // the rendered children
  __k: VNode[] | null;
}

interface TextNode {
  type: null;
  props: string;
}

/**
 * Returns the descendants of the given vnode from it's last render.
 */
function getDescendants<P>(node: VNode<P>) {
  return (node as PreactVNode<P>)._children ?? [];
}

/**
 * Returns the rendered DOM node associated with a rendered VNode.
 */
function getDOMNode<P>(node: VNode<P>): PreactVNode<P>['__e'] {
  return (node as PreactVNode<P>)._remoteNode;
}

/**
 * Returns the `Component` instance associated with a rendered VNode.
 */
function getComponent<P>(node: VNode<P>): PreactComponent<P> | null {
  return (node as PreactVNode<P>)._component;
}

/**
 * Returns the `VNode` associated with a component.
 */
function getVNode<P>(component: Component<P>) {
  return (component as PreactComponent<P>)._vnode;
}

// Text nodes in peact are very weird, they actually have a null `type` field
// (despite that not being part of the type for VNode) and their props are just
// the text content (despite that being typed as an object)
function isTextNode(node: unknown): node is TextNode {
  return (
    node != null &&
    (node as any).type === null &&
    typeof (node as any).props === 'string'
  );
}

function toArray<T>(maybeArray: T | T[] | null | undefined) {
  if (maybeArray == null) {
    return [];
  }

  if (Array.isArray(maybeArray)) {
    return maybeArray;
  }

  return [maybeArray];
}
