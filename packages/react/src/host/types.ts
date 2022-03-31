import type {ComponentType, ReactNode} from 'react';
import type {
  RemoteReceiver,
  RemoteReceiverAttachableRoot,
  RemoteReceiverAttachableComponent,
  RemoteReceiverAttachableText,
  RemoteComponentType,
  RemoteReceiverAttachableFragment,
} from '@remote-ui/core';

export interface RemoteTextProps {
  parent: RemoteReceiverAttachableRoot | RemoteReceiverAttachableComponent;
  text: RemoteReceiverAttachableText;
  receiver: RemoteReceiver;
  key: string | number;
}

export interface RemoteComponentProps {
  receiver: RemoteReceiver;
  parent: RemoteReceiverAttachableRoot | RemoteReceiverAttachableComponent;
  component: RemoteReceiverAttachableComponent;
  controller: Controller;
  key: string | number;
}

export interface RemoteFragmentProps {
  receiver: RemoteReceiver;
  parent: RemoteReceiverAttachableComponent;
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
