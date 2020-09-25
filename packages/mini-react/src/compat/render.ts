import {render as baseRender} from '../render';
import options from '../options';
import type {ComponentChild, RemoteParentNode} from '../types';

export const REACT_ELEMENT_TYPE =
  (typeof Symbol !== 'undefined' && Symbol.for?.('react.element')) || 0xeac7;

const oldVNodeHook = options.vnode;

options.vnode = (vnode) => {
  (vnode as any).$$typeof = REACT_ELEMENT_TYPE;
  oldVNodeHook?.(vnode);
};

/**
 * Proxy render() since React returns a Component reference.
 */
export function render(
  child: ComponentChild,
  remoteNode: RemoteParentNode,
  callback?: () => void,
) {
  // React destroys any existing DOM nodes, but only on the first render
  if (remoteNode._vnode == null) {
    for (const child of remoteNode.children) {
      remoteNode.removeChild(child);
    }
  }

  baseRender(child, remoteNode);
  callback?.();

  return (child as any)?._component ?? null;
}
