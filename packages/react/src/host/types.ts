import type {ComponentType, ReactElement} from 'react';
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
  renderComponent(props: RemoteComponentProps): ReactElement;
  renderText(props: RemoteTextProps): ReactElement;
}

export interface RenderComponentOptions {
  renderDefault: Renderer['renderComponent'];
}

export interface RenderTextOptions {
  renderDefault: Renderer['renderText'];
}
