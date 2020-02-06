import {ComponentType} from 'react';
import {RemoteComponentType} from '@shopify/remote-ui-core';

export interface ComponentMapping {
  [key: string]: ComponentType<any>;
}

export class Controller<ComponentConfig extends ComponentMapping = {}> {
  private readonly registry: Map<string, ComponentType<any>>;

  constructor(public readonly components: ComponentConfig = {} as any) {
    this.registry = new Map(Object.entries(components));
  }

  get(type: string | RemoteComponentType<any, any, any>) {
    return this.registry.get(type as any);
  }
}
