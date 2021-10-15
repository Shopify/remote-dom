import {KIND_COMPONENT, KIND_ROOT} from '@remote-ui/core';

import type {RemoteElement, RemoteComponent} from './types';

export function eachComponent(
  element: RemoteElement,
  callback: (component: RemoteComponent<string, any>) => void | boolean,
) {
  each(element);

  function each(element: RemoteElement): boolean {
    if (element.kind !== KIND_ROOT) {
      const result = callback(element);
      if (result === false) return false;
    }

    for (const child of element.children) {
      if (child.kind !== KIND_COMPONENT) continue;
      const result = each(child);
      if (!result) return false;
    }

    return true;
  }
}

export function objectContains<T>(actual: T, expected: Partial<T>) {
  return (Object.keys(expected) as (keyof T)[]).every(
    (key: keyof T) => actual[key] === expected[key],
  );
}
