import type {ReactNode, ComponentType} from 'react';
import type {
  RemoteComponentType,
  PropsForRemoteComponent,
} from '@remote-ui/core';

export type ReactPropsFromRemoteComponentType<
  Type extends RemoteComponentType<string, any, any>
> = PropsForRemoteComponent<Type> & {children?: ReactNode};

export type ReactComponentTypeFromRemoteComponentType<
  Type extends RemoteComponentType<string, any, any>
> = ComponentType<ReactPropsFromRemoteComponentType<Type>>;
