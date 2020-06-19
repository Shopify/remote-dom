import {ComponentType} from 'react';
import {RemoteComponentType} from '@shopify/rui-core';

export interface ComponentMapping {
  [key: string]: ComponentType<any>;
}

export class Controller<ComponentConfig extends ComponentMapping = {}> {
  private readonly registry: Map<string, ComponentType<any>>;

  constructor(public readonly components: ComponentConfig = {} as any) {
    this.registry = new Map(Object.entries(components));
  }

  get(type: string | RemoteComponentType<any, any, any>) {
    if (!this.registry.has(type as any)) {
      throw new Error(`Unknown component: ${type}`);
    }
    return this.registry.get(type as any);
  }
}
