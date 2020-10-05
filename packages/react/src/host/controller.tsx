import type {ComponentType} from 'react';
import type {RemoteComponentType} from '@remote-ui/core';

export interface ComponentMapping {
  [key: string]: ComponentType<any>;
}

export class Controller<ComponentConfig extends ComponentMapping = {}> {
  private readonly registry: Map<string, ComponentType<any>>;

  constructor(public readonly components: ComponentConfig = {} as any) {
    this.registry = new Map(Object.entries(components));
  }

  get(type: string | RemoteComponentType<string, any, any>) {
    if (!this.registry.has(type as any)) {
      throw new Error(`Unknown component: ${type}`);
    }
    return this.registry.get(type as any);
  }
}
