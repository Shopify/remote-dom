import {createVNode} from './create-element';
import type {ComponentChildren, Ref, Key, VNode} from './types';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 */
export function cloneElement<P>(
  vnode: VNode<P>,
  props: Partial<P>,
  ...children: ComponentChildren[]
): VNode<P> {
  const normalizedProps: Record<string, unknown> = {...vnode.props};
  let key: Key | undefined;
  let ref: Ref<unknown> | undefined;
  let prop: string;

  for (prop in props) {
    if (prop === 'key') {
      key = (props as any)[prop];
    } else if (prop === 'ref') {
      ref = (props as any)[prop];
    } else {
      normalizedProps[prop] = (props as any)[prop];
    }
  }

  if (children.length) {
    normalizedProps.children = children;
  }

  return createVNode(
    vnode.type,
    normalizedProps,
    key ?? vnode.key,
    ref ?? vnode.ref,
    null,
  ) as VNode<P>;
}
