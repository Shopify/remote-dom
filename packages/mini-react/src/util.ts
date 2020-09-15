import type {RemoteChild} from '@remote-ui/core';

/**
 * Assign properties from `props` to `obj`
 * @template O, P The obj and props types
 * @param {O} obj The object to copy properties to
 * @param {P} props The object to copy properties from
 * @returns {O & P}
 */
export function assign<T, O>(obj: T, props: O): T & O {
  // eslint-disable-next-line guard-for-in
  for (const i in props) (obj as any)[i] = props[i];
  return obj as any;
}

export function removeNode(node: RemoteChild<any>) {
  node.parent?.removeChild(node);
}
