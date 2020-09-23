import {render as baseRender} from '../render';
import type {ComponentChild, RemoteParentNode} from '../types';

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
