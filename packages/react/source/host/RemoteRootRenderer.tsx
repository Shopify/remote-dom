import {useRemoteReceived} from './hooks/remote-received.ts';
import {renderRemoteNode} from './node.tsx';
import type {RemoteNodeRenderOptions} from './types.ts';

export interface RemoteRootRendererProps extends RemoteNodeRenderOptions {}

/**
 * A component that can be used to render a tree of UI elements from a remote
 * environment.
 */
export function RemoteRootRenderer(props: RemoteRootRendererProps) {
  const {receiver} = props;
  const {children} = useRemoteReceived(receiver.root, receiver)!;
  return <>{children.map((child) => renderRemoteNode(child, props))}</>;
}
