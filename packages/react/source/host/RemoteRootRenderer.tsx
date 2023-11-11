import {useRemoteReceived} from './hooks/remote-received.ts';
import {renderRemoteNode, type RenderRemoteNodeOptions} from './node.tsx';

export interface RemoteRootRendererProps extends RenderRemoteNodeOptions {}

export function RemoteRootRenderer(props: RemoteRootRendererProps) {
  const {receiver} = props;
  const {children} = useRemoteReceived(receiver.root, receiver)!;
  return <>{children.map((child) => renderRemoteNode(child, props))}</>;
}
