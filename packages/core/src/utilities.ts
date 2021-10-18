import type {RemoteComponentType} from '@remote-ui/types';

import type {
  RemoteRoot,
  RemoteComponent,
  RemoteText,
  RemoteFragment,
} from './types';
import {KIND_COMPONENT, KIND_TEXT, KIND_FRAGMENT} from './types';

export function isRemoteComponent<
  Type extends RemoteComponentType<string, any, any> = any,
  Root extends RemoteRoot<any, any> = RemoteRoot<any, any>,
>(child: unknown): child is RemoteComponent<Type, Root> {
  return child != null && (child as any).kind === KIND_COMPONENT;
}

export function isRemoteText<
  Root extends RemoteRoot<any, any> = RemoteRoot<any, any>,
>(child: unknown): child is RemoteText<Root> {
  return child != null && (child as any).kind === KIND_TEXT;
}

export function isRemoteFragment<
  Root extends RemoteRoot<any, any> = RemoteRoot<any, any>,
>(object: unknown): object is RemoteFragment<Root> {
  return object != null && (object as any).kind === KIND_FRAGMENT;
}
