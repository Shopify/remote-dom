import type {Component} from 'vue';

export interface ComponentMapping {
  [key: string]: Component<any>;
}

export interface Controller {
  get(type: string): Component<any>;
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
