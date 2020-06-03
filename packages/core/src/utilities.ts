import type {RemoteComponentType} from '@remote-ui/types';
import type {
  RemoteRoot,
  RemoteComponent,
  RemoteText,
  RemoteChild,
} from './types';
import {KIND_COMPONENT, KIND_TEXT} from './types';

export function isRemoteComponent<
  Type extends RemoteComponentType<string, any, any> = any,
  Root extends RemoteRoot<any, any> = RemoteRoot<any, any>
>(child: RemoteChild<Root>): child is RemoteComponent<Type, Root> {
  return child.kind === KIND_COMPONENT;
}

export function isRemoteText<
  Root extends RemoteRoot<any, any> = RemoteRoot<any, any>
>(child: RemoteChild<Root>): child is RemoteText<Root> {
  return child.kind === KIND_TEXT;
}
