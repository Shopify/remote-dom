import {renderRemoteNode, type RenderRemoteNodeOptions} from './node.tsx';

export interface RemoteRootRendererProps extends RenderRemoteNodeOptions {}

/**
 * A component that can be used to render a tree of UI elements from a remote
 * environment.
 */
export function RemoteRootRenderer(props: RemoteRootRendererProps) {
  const {receiver} = props;
  const children = receiver.root.children.value;
  return <>{children.map((child) => renderRemoteNode(child, props))}</>;
}
