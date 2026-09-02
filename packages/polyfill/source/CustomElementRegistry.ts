const VALID_CUSTOM_ELEMENT_NAME =
  /^[a-z][^A-Z\u0000\t\n\f\r />]*-[^A-Z\u0000\t\n\f\r />]*$/u;

const RESERVED_CUSTOM_ELEMENT_NAMES = new Set([
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph',
]);

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
    if (
      !VALID_CUSTOM_ELEMENT_NAME.test(name) ||
      RESERVED_CUSTOM_ELEMENT_NAMES.has(name)
    ) {
      throw new DOMException(
        `Invalid custom element name: "${name}"`,
        'SyntaxError',
      );
    }

    if (this.registry.has(name)) {
      throw new DOMException(
        `A custom element named "${name}" has already been defined`,
        'NotSupportedError',
      );
    }

    if (this.getName(Constructor) != null) {
      throw new DOMException(
        'This constructor has already been registered in this custom element registry',
        'NotSupportedError',
      );
    }

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

  getName(Constructor: CustomElementConstructor) {
    for (const [name, value] of this.registry) {
      if (value === Constructor) return name;
    }

    return null;
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

  initialize(_root: Node) {
    // TODO
  }
}
