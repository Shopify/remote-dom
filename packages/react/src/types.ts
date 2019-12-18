import {ReactNode, ComponentType} from 'react';
import {
  RemoteChild,
  PropsForRemoteComponent,
  ChildrenForRemoteComponent,
} from '@remote-ui/core';

type ChildrenProp<Type extends string> = ChildrenForRemoteComponent<
  Type
> extends string
  ? {children?: ReactNode}
  : ChildrenForRemoteComponent<Type> extends RemoteChild
  ? {children?: ReactNode}
  : {
      children?: never;
    };

export type ReactPropsFromRemoteComponent<
  Type extends string
> = PropsForRemoteComponent<Type> & ChildrenProp<Type>;

export type ReactComponentFromRemoteComponent<
  Type extends string
> = ComponentType<ReactPropsFromRemoteComponent<Type>>;
