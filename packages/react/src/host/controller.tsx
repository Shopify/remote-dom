import {ComponentType} from 'react';

export class Controller<
  ComponentConfig extends {[key: string]: ComponentType<any>} = {}
> {
  private readonly registry: Map<string, ComponentType<any>>;

  constructor(public readonly components: ComponentConfig = {} as any) {
    this.registry = new Map(Object.entries(components));
  }

  get(name: string) {
    return this.registry.get(name)!;
  }
}
