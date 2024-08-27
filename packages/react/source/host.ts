export {
  RemoteReceiver,
  type RemoteReceiverElement,
  type RemoteReceiverText,
  type RemoteReceiverComment,
  type RemoteReceiverRoot,
  type RemoteReceiverNode,
  type RemoteReceiverParent,
} from '@remote-dom/core/receivers';

export {renderRemoteNode} from './host/node.tsx';
export {
  createRemoteComponentRenderer,
  type RemoteComponentRendererOptions,
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

export {
  useRemoteReceived,
  usePropsForRemoteElement,
  type RemoteElementPropsOptions,
} from './host/hooks.ts';

export type {
  RemoteNodeRenderOptions,
  RemoteComponentRendererMap,
  RemoteComponentRendererProps,
} from './host/types.ts';
export {
  REMOTE_ELEMENT_PROP,
  REMOTE_ELEMENT_ATTACHED_PROP,
} from './host/constants.ts';

export type {
  RemoteComponentProps,
  RemoteComponentTypeFromElementConstructor,
  RemoteComponentPropsFromElementConstructor,
} from './types.ts';
