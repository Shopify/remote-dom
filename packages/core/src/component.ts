import {RemoteComponentType} from '@remote-ui/types';

export function createRemoteComponent<
  Type extends string,
  Props = {},
  AllowedChildren extends RemoteComponentType<any, any> | boolean = true
>(
  componentType: Type,
): Type & RemoteComponentType<Type, Props, AllowedChildren> {
  return componentType as any;
}
