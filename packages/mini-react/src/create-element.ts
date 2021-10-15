import type {RemoteComponentType} from '@remote-ui/core';

import options from './options';
import type {
  VNode,
  ComponentType,
  ComponentChildren,
  CommonProps,
  Key,
  Ref,
} from './types';

/**
 * Create a virtual node (used for JSX)
 */
export function createElement<P>(
  type: string | RemoteComponentType<any, P, any> | ComponentType<P>,
  props?: (P & CommonProps) | null,
  ...children: ComponentChildren[]
): VNode<P> {
  const normalizedProps: Record<string, unknown> = {};
  let prop: string;

  let key: Key | undefined;
  let ref: Ref<unknown> | undefined;

  for (prop in props) {
    if (prop === 'key') {
      key = props![prop];
    } else if (prop === 'ref') {
      ref = (props as any)[prop];
    } else {
      normalizedProps[prop] = (props as any)[prop];
    }
  }

  if (children.length) {
    normalizedProps.children = children;
  }

  if (typeof type === 'function' && type.defaultProps != null) {
    for (prop in type.defaultProps) {
      if (normalizedProps[prop] === undefined) {
        normalizedProps[prop] = type.defaultProps[prop];
      }
    }
  }

  return createVNode(type, normalizedProps, key, ref, null) as VNode<P>;
}

/**
 * Create a VNode (used internally)
 */
export function createVNode(
  type: VNode<any>['type'] | null,
  props: Record<string, unknown> | string | number | null,
  key: Key | undefined,
  ref: Ref<unknown> | undefined,
  original: VNode<unknown>['_original'] | null,
) {
  // V8 seems to be better at detecting type shapes if the object is allocated from the same call site
  // Do not inline into createElement and coerceToVNode!
  const vnode: VNode<any> = {
    type,
    props: props as any,
    key,
    ref,
    _children: null,
    _parent: null,
    _depth: 0,
    _remoteNode: null,
    // _nextRemoteNode must be initialized to undefined b/c it will eventually
    // be set to dom.nextSibling which can return `null` and it is important
    // to be able to distinguish between an uninitialized _nextRemoteNode and
    // a _nextRemoteNode that has been set to `null`
    _nextRemoteNode: undefined,
    _component: undefined,
    constructor: undefined,
    _original: original as any,
  };

  if (original == null) vnode._original = vnode;

  options.vnode?.(vnode);

  return vnode;
}
