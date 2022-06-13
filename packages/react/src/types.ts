import type {ReactNode, ComponentType, ReactElement} from 'react';
import type {RemoteComponentType, RemoteFragment} from '@remote-ui/core';

type PropsForRemoteComponent<T> = T extends RemoteComponentType<
  string,
  infer Props,
  any
>
  ? Props extends Record<string, never>
    ? // eslint-disable-next-line @typescript-eslint/ban-types
      {}
    : {[K in keyof Props]: RemoteFragmentToReactElement<Props[K]>}
  : never;

type RemoteFragmentToReactElement<T> = T extends RemoteFragment<infer R>
  ? ReactElement | false | RemoteFragment<R>
  : T;

export type ReactPropsFromRemoteComponentType<
  Type extends RemoteComponentType<string, any, any>,
> = PropsForRemoteComponent<Type> & {
  children?: ReactNode;
};

export type ReactComponentTypeFromRemoteComponentType<
  Type extends RemoteComponentType<string, any, any>,
> = ComponentType<ReactPropsFromRemoteComponentType<Type>>;
