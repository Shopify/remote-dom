import {renderRemoteNode, type RenderRemoteNodeOptions} from './node.tsx';

export interface RemoteRootRendererProps extends RenderRemoteNodeOptions {}

export function RemoteRootRenderer(props: RemoteRootRendererProps) {
  const {receiver} = props;
  const children = receiver.root.children.value;
  return <>{children.map((child) => renderRemoteNode(child, props))}</>;
}
