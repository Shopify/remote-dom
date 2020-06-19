import {ReactNode, ComponentType} from 'react';
import {RemoteComponentType, PropsForRemoteComponent} from '@shopify/rui-core';

export type ReactPropsFromRemoteComponentType<
  Type extends RemoteComponentType<any, any, any>
> = PropsForRemoteComponent<Type> & {children?: ReactNode};

export type ReactComponentTypeFromRemoteComponentType<
  Type extends RemoteComponentType<any, any, any>
> = ComponentType<ReactPropsFromRemoteComponentType<Type>>;
