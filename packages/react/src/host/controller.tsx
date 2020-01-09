import {ComponentType} from 'react';
import {RemoteComponentType} from '@remote-ui/core';

export class Controller<
  ComponentConfig extends {[key: string]: ComponentType<any>} = {}
> {
  private readonly registry: Map<string, ComponentType<any>>;

  constructor(public readonly components: ComponentConfig = {} as any) {
    this.registry = new Map(Object.entries(components));
  }

  get(type: string | RemoteComponentType<any, any, any>) {
    return this.registry.get(type as any);
  }
}
