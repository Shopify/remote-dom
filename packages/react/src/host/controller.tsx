import type {ComponentType} from 'react';
import type {RemoteComponentType} from '@remote-ui/core';

export interface ComponentMapping {
  [key: string]: ComponentType<any>;
}

export interface Controller {
  get(type: string | RemoteComponentType<string, any, any>): ComponentType<any>;
}

export function createController(components: ComponentMapping): Controller {
  const registry = new Map(Object.entries(components));

  return {
    get(type) {
      const value = registry.get(type as any);
      if (value == null) {
        throw new Error(`Unknown component: ${type}`);
      }
      return value;
    },
  };
}
