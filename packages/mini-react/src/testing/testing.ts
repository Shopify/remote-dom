import {createRemoteRoot} from '@remote-ui/core';
import type {RemoteRoot} from '@remote-ui/core';
import {createEnvironment} from '@quilted/react-testing/environment';
import type {
  CustomMount,
  Environment,
} from '@quilted/react-testing/environment';

import {render} from '..';
import type {ComponentChild, VNode, ComponentInternal} from '../types';

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

    render(tree as any, root);

    return {root};
  },
  unmount({root}) {
    render(null, root);
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
  const instance = node._component ?? node._remoteNode;
  const children = toArray(node._children ?? [])
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

interface TextNode {
  type: null;
  props: string;
}

/**
 * Returns the `VNode` associated with a component.
 */
function getVNode<P>(component: ComponentInternal<P>) {
  return component._vnode;
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
