export {
  SignalRemoteReceiver,
  type SignalRemoteReceiverElement,
  type SignalRemoteReceiverText,
  type SignalRemoteReceiverComment,
  type SignalRemoteReceiverRoot,
  type SignalRemoteReceiverNode,
  type SignalRemoteReceiverParent,
} from '@remote-dom/signals';
export {renderRemoteNode, type RenderRemoteNodeOptions} from './host/node.tsx';
export {
  createRemoteComponentRenderer,
  type RemoteComponentRendererAdditionalProps,
} from './host/component.tsx';
export {RemoteFragmentRenderer} from './host/RemoteFragmentRenderer.tsx';
export {
  RemoteRootRenderer,
  type RemoteRootRendererProps,
} from './host/RemoteRootRenderer.tsx';

export {usePropsForRemoteElement} from './host/hooks.ts';

export type {
  RemoteComponentRendererMap,
  RemoteComponentRendererProps,
} from './host/types.ts';
export {REMOTE_ELEMENT_PROP} from './host/constants.ts';

export type {
  RemoteComponentType,
  RemoteComponentProps,
  RemoteComponentTypeFromElementConstructor,
  RemoteComponentPropsFromElementConstructor,
} from './types.ts';
