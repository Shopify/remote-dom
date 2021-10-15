import type {
  PropsForRemoteComponent,
  RemoteComponentType,
} from '@remote-ui/core';

import type {RemoteElement, RemoteComponent} from './types';
import {eachComponent, objectContains} from './internal';

export function find<Type extends RemoteComponentType<string, any, any>>(
  element: RemoteElement,
  type: Type,
  props?: Partial<PropsForRemoteComponent<Type>>,
) {
  let match: RemoteComponent<Type, any> | null = null;

  eachComponent(element, (component) => {
    if (
      component.type === type &&
      (props == null || objectContains(component.props, props))
    ) {
      match = component;
      return false;
    }

    return true;
  });

  return match;
}

export function findAll<Type extends RemoteComponentType<string, any, any>>(
  element: RemoteElement,
  type: Type,
  props?: Partial<PropsForRemoteComponent<Type>>,
) {
  const components: RemoteComponent<Type, any>[] = [];

  eachComponent(element, (component) => {
    if (
      component.type === type &&
      (props == null || objectContains(component.props, props))
    )
      components.push(component as any);
  });

  return components;
}
