import type {RemoteComponentType} from '@remote-ui/core';

import {Fragment} from './Fragment';
import options from './options';
import type {VNode, Key, ComponentType, ComponentChildren} from './types';

function createVNode<P>(
  type: string | RemoteComponentType<any, P, any> | ComponentType<P>,
  props: P & {children?: ComponentChildren},
  key?: Key,
  __source?: string,
  __self?: string,
): VNode<P> {
  // If a Component VNode, check for and apply defaultProps
  // Note: type may be undefined in development, must never error here.
  const defaultProps = type?.defaultProps;

  if (defaultProps) {
    for (const key in defaultProps) {
      if ((props as any)[key] === undefined) {
        (props as any)[key] = defaultProps[key];
      }
    }
  }

  const vnode: VNode<P> & {__source?: string; __self?: string} = {
    type,
    props,
    key,
    ref: (props as any)?.ref,
    _children: null,
    _parent: null,
    _depth: 0,
    _remoteNode: null,
    _nextRemoteNode: undefined,
    _component: undefined,
    constructor: undefined,
    _original: null,
    __source,
    __self,
  };

  vnode._original = vnode;

  options.vnode?.(vnode);

  return vnode;
}

export {
  createVNode as jsx,
  createVNode as jsxs,
  createVNode as jsxDEV,
  Fragment,
};
