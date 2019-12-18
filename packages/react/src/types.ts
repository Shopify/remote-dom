import {ReactNode, ComponentType} from 'react';
import {PropsForRemoteComponent} from '@remote-ui/core';

export type ReactPropsFromRemoteComponent<
  Type extends string
> = PropsForRemoteComponent<Type> & {children?: ReactNode};

export type ReactComponentFromRemoteComponent<
  Type extends string
> = ComponentType<ReactPropsFromRemoteComponent<Type>>;
