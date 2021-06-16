import type {ComponentType, ReactElement} from 'react';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableComponent,
  RemoteReceiverAttachableText,
  RemoteComponentType,
} from '@remote-ui/core';

export interface RemoteTextProps {
  text: RemoteReceiverAttachableText;
  receiver: RemoteReceiver;
}

export interface RemoteComponentProps {
  receiver: RemoteReceiver;
  component: RemoteReceiverAttachableComponent;
  controller: Controller;
}

export interface Controller {
  get(type: string | RemoteComponentType<string, any, any>): ComponentType<any>;
  renderer: Renderer;
}

export interface Renderer {
  renderComponent: (props: RemoteComponentProps) => ReactElement;
  renderText: (props: RemoteTextProps) => ReactElement;
}
