import {
  PropsForRemoteComponent,
  RemoteComponentType,
  RemoteText,
  KIND_COMPONENT,
} from '@remote-ui/core';

import type {RemoteComponent} from './types';
import {objectContains} from './internal';

export function closest<Type extends RemoteComponentType<string, any, any>>(
  element: RemoteComponent<string, any> | RemoteText<any>,
  type: Type,
  props?: Partial<PropsForRemoteComponent<Type>>,
) {
  // let match: RemoteComponent<Type, any> | null = null;
  let current = element;

  while (current) {
    if (
      'kind' in current &&
      current.kind === KIND_COMPONENT &&
      current.type === type &&
      (props == null || objectContains(current.props, props))
    ) {
      return current;
    }

    current = current.parent;
  }

  return null;
}
