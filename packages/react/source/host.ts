export {
  RemoteReceiver,
  type RemoteReceiverElement,
  type RemoteReceiverText,
  type RemoteReceiverComment,
  type RemoteReceiverRoot,
  type RemoteReceiverNode,
  type RemoteReceiverParent,
} from '@remote-dom/core/receiver';

export {renderRemoteNode, type RenderRemoteNodeOptions} from './host/node.tsx';
export {
  createRemoteComponentRenderer,
  type RemoteComponentRendererAdditionalProps,
} from './host/component.tsx';
export {RemoteFragmentRenderer} from './host/RemoteFragmentRenderer.tsx';
export {
  RemoteTextRenderer,
  type RemoteTextRendererProps,
} from './host/RemoteTextRenderer.tsx';
export {
  RemoteRootRenderer,
  type RemoteRootRendererProps,
} from './host/RemoteRootRenderer.tsx';

export {useRemoteReceived, usePropsForRemoteElement} from './host/hooks.ts';

export type {
  RemoteComponentRendererMap,
  RemoteComponentRendererProps,
} from './host/types.ts';
export {
  REMOTE_ELEMENT_PROP,
  REMOTE_ELEMENT_ATTACHED_PROP,
} from './host/constants.ts';

export type {
  RemoteComponentType,
  RemoteComponentProps,
  RemoteComponentTypeFromElementConstructor,
  RemoteComponentPropsFromElementConstructor,
} from './types.ts';
