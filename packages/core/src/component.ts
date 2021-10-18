import {RemoteComponentType} from '@remote-ui/types';

export function createRemoteComponent<
  Type extends string,
  Props = Record<string, never>,
  AllowedChildren extends RemoteComponentType<string, any> | boolean = true,
>(
  componentType: Type,
): Type & RemoteComponentType<Type, Props, AllowedChildren> {
  return componentType as any;
}
