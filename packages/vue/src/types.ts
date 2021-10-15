import type {Component} from 'vue';
import type {
  RemoteComponentType,
  PropsForRemoteComponent,
} from '@remote-ui/core';

export type VuePropsFromRemoteComponentType<
  Type extends RemoteComponentType<string, any, any>,
> = PropsForRemoteComponent<Type>;

export type VueComponentTypeFromRemoteComponentType<
  Type extends RemoteComponentType<string, any, any>,
> = Component<VuePropsFromRemoteComponentType<Type>>;
