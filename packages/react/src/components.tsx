import {RemoteComponentType} from '@remote-ui/core';
import {ReactComponentTypeFromRemoteComponentType} from './types';

export function createRemoteReactComponent<
  Type extends string,
  Props = {},
  AllowedChildren extends RemoteComponentType<any, any> | boolean = true
>(
  componentType: Type | RemoteComponentType<Type, Props, AllowedChildren>,
): RemoteComponentType<Type, Props, AllowedChildren> &
  ReactComponentTypeFromRemoteComponentType<
    RemoteComponentType<Type, Props, AllowedChildren>
  > {
  return componentType as any;
}
