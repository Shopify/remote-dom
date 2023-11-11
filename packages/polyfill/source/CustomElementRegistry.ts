export class CustomElementRegistryImplementation
  implements CustomElementRegistry
{
  private registry = new Map<string, CustomElementConstructor>();
  private listenersByName = new Map<
    string,
    ((Constructor: CustomElementConstructor) => void)[]
  >();

  define(
    name: string,
    Constructor: CustomElementConstructor,
    _options?: ElementDefinitionOptions,
  ) {
    this.registry.set(name, Constructor);

    const listeners = this.listenersByName.get(name);

    if (listeners == null) return;

    this.listenersByName.delete(name);

    for (const listener of listeners) {
      listener(Constructor);
    }
  }

  get(name: string) {
    return this.registry.get(name);
  }

  whenDefined(name: string) {
    const Constructor = this.registry.get(name);

    if (Constructor != null) return Promise.resolve(Constructor);

    let listeners = this.listenersByName.get(name);

    if (listeners == null) {
      listeners = [];
      this.listenersByName.set(name, listeners);
    }

    return new Promise<CustomElementConstructor>((resolve) => {
      listeners!.push(resolve);
    });
  }

  upgrade(_root: Node) {
    // TODO
  }
}
