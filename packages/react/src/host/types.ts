import type {ComponentType, ReactNode} from 'react';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableComponent,
  RemoteReceiverAttachableText,
  RemoteComponentType,
  RemoteReceiverAttachableFragment,
} from '@remote-ui/core';

export interface RemoteTextProps {
  text: RemoteReceiverAttachableText;
  receiver: RemoteReceiver;
  key: string | number;
}

export interface RemoteComponentProps {
  receiver: RemoteReceiver;
  component: RemoteReceiverAttachableComponent;
  controller: Controller;
  key: string | number;
}

export interface RemoteFragmentProps {
  receiver: RemoteReceiver;
  fragment: RemoteReceiverAttachableFragment;
  controller: Controller;
}

export interface Controller {
  get(type: string | RemoteComponentType<string, any, any>): ComponentType<any>;
  renderer: Renderer;
}

export interface Renderer {
  renderComponent(props: RemoteComponentProps): ReactNode;
  renderText(props: RemoteTextProps): ReactNode;
}

export interface RenderComponentOptions {
  renderDefault(): ReactNode;
}

export interface RenderTextOptions {
  renderDefault(): ReactNode;
}
