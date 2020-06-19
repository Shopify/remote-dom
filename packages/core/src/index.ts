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
  KIND_COMPONENT,
  KIND_TEXT,
} from './types';
export type {
  RemoteRoot,
  RemoteChannel,
  RemoteComponent,
  RemoteText,
  RemoteChild,
  Serialized,
  ActionArgumentMap,
  RemoteTextSerialization,
  RemoteComponentSerialization,
} from './types';
export {createRemoteRoot} from './root';
export {RemoteReceiver, createRemoteChannel} from './receiver';
export {isRemoteComponent, isRemoteText} from './utilities';
