import {RemoteRoot} from '@remote-ui/core';
import {createRemoteReactComponent} from '@remote-ui/react';

// Components

export interface ButtonProps {
  // Functions passed over @remote-ui/rpc always return promises,
  // so make sure it’s a considered return type.
  onPress(): void | Promise<void>;
}

export const Button = createRemoteReactComponent<
  'Button',
  ButtonProps
>('Button');

export interface CardProps {}

export const Card = createRemoteReactComponent<'Card', CardProps>('Card');

// Global API

export interface User {
  id: string;
  getDetails(): Promise<{occupation?: string}>;
}

export type RenderCallback = (root: RemoteRoot, user: User) => void;

export interface GlobalApi {
  onRender(renderer: RenderCallback): void;
}

export function onRender(renderer: RenderCallback) {
  return (self as any as GlobalApi).onRender(renderer);
}
