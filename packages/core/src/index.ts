export type {
  RemoteComponentType,
  PropsForRemoteComponent,
  AllowedChildrenForRemoteComponent,
} from '@remote-ui/types';

export {retain, release} from '@remote-ui/rpc';

export {createRemoteComponent} from './component';
export {Action} from './types';
export type {
  RemoteRoot,
  RemoteChannel,
  RemoteComponent,
  RemoteText,
  Serialized,
} from './types';
export {createRemoteRoot} from './root';
export {RemoteReceiver} from './receiver';
