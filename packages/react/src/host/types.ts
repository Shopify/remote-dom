import type {
  RemoteReceiver,
  RemoteReceiverAttachableComponent,
  RemoteReceiverAttachableText,
} from '@remote-ui/core';

import type {Controller} from './controller';

export interface RemoteTextProps {
  text: RemoteReceiverAttachableText;
  receiver: RemoteReceiver;
}

export interface RemoteComponentProps {
  receiver: RemoteReceiver;
  component: RemoteReceiverAttachableComponent;
  controller: Controller;
}
