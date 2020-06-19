import {RemoteChild, RemoteComponentType} from '@shopify/rui-core';

import {ReactComponentTypeFromRemoteComponentType} from './types';

export function createRemoteReactComponent<
  Type extends string,
  Props = {},
  AllowedChildren extends
    | RemoteChild
    | RemoteComponentType<any, any> = RemoteChild
>(
  componentType: Type | RemoteComponentType<Type, Props, AllowedChildren>,
): RemoteComponentType<Type, Props, AllowedChildren> &
  ReactComponentTypeFromRemoteComponentType<
    RemoteComponentType<Type, Props, AllowedChildren>
  > {
  return componentType as any;
}
