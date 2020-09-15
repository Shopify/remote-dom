import type {RemoteRoot} from '@remote-ui/core';
import type {ReactRemoteNode} from '../types';

export function getRemoteRoot(node: ReactRemoteNode): RemoteRoot<any, any> {
  return 'root' in node ? node.root : node;
}
