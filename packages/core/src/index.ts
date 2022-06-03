export type {
  RemoteComponentType,
  PropsForRemoteComponent,
  AllowedChildrenForRemoteComponent,
  IdentifierForRemoteComponent,
} from '@remote-ui/types';

export {retain, release} from '@remote-ui/rpc';

export {createRemoteComponent} from './component';
export {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT,
  KIND_ROOT,
  KIND_COMPONENT,
  KIND_TEXT,
  KIND_FRAGMENT,
} from './types';
export type {
  RemoteRoot,
  RemoteChannel,
  RemoteComponent,
  RemoteText,
  RemoteChild,
  RemoteFragment,
  Serialized,
  ActionArgumentMap,
  RemoteTextSerialization,
  RemoteComponentSerialization,
  RemoteFragmentSerialization,
} from './types';
export {createRemoteRoot} from './root';
export {
  createRemoteReceiver,
  createRemoteChannel,
  isRemoteFragmentSerialization,
  isRemoteReceiverAttachableFragment,
} from './receiver';
export type {
  RemoteReceiver,
  RemoteReceiverAttachment,
  RemoteReceiverAttachable,
  RemoteReceiverAttachableChild,
  RemoteReceiverAttachableRoot,
  RemoteReceiverAttachableComponent,
  RemoteReceiverAttachableText,
  RemoteReceiverAttachableFragment,
} from './receiver';
export {isRemoteComponent, isRemoteText, isRemoteFragment} from './utilities';
