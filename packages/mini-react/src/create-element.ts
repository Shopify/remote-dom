import options from './options';
import type {VNode, ComponentChildren, Key, Ref} from './types';

export function createElement(
  type: VNode['type'],
  props: {[key: string]: any} | null | undefined,
  children?: ComponentChildren,
): VNode {
  const normalizedProps: {[key: string]: any} = {};
  let key: Key | undefined;
  let ref: Ref<any> | undefined;
  let i;

  for (const prop in props) {
    if (prop === 'key') key = props![prop];
    else if (prop === 'ref') ref = props![prop];
    else normalizedProps[prop] = props![prop];
  }

  let normalizedChildren = children;

  if (arguments.length > 3) {
    normalizedChildren = [children];
    // https://github.com/preactjs/preact/issues/1916
    for (i = 3; i < arguments.length; i++) {
      (normalizedChildren as any[]).push(arguments[i]);
    }
  }

  if (normalizedChildren != null) {
    normalizedProps.children = normalizedChildren;
  }

  // If a Component VNode, check for and apply defaultProps
  // Note: type may be undefined in development, must never error here.
  if (typeof type === 'function' && type.defaultProps != null) {
    for (i in type.defaultProps) {
      if (normalizedProps[i] === undefined) {
        normalizedProps[i] = (type.defaultProps as any)[i];
      }
    }
  }

  return createVNode(type, normalizedProps, key, ref, null);
}

/**
 * Create a VNode (used internally by Preact)
 */
export function createVNode(
  type: VNode['type'],
  props: object | string | number | null,
  key: Key | null,
  ref: VNode['ref'],
  original?: VNode<any> | string | number | null,
): VNode<any> {
  // V8 seems to be better at detecting type shapes if the object is allocated from the same call site
  // Do not inline into createElement and coerceToVNode!
  const vnode: VNode<any> = {
    type,
    props,
    key,
    ref,
    _children: null,
    _parent: null,
    _depth: 0,
    _dom: null,
    // _nextDom must be initialized to undefined b/c it will eventually
    // be set to dom.nextSibling which can return `null` and it is important
    // to be able to distinguish between an uninitialized _nextDom and
    // a _nextDom that has been set to `null`
    _nextDom: undefined,
    _component: null,
    constructor: undefined,
    _original: original,
  };

  if (original == null) vnode._original = vnode;

  options.vnode?.(vnode);

  return vnode;
}

export function createRef() {
  return {current: null};
}

export function Fragment(props: any) {
  return props.children;
}

export const isValidElement = (vnode: unknown): vnode is VNode =>
  vnode != null && (vnode as any).constructor === undefined;
