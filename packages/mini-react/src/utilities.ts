import type {RemoteChild, RemoteRoot} from '@remote-ui/core';

export function removeNode(node: RemoteChild<RemoteRoot<any, any>>) {
  node.parent?.removeChild(node);
}
