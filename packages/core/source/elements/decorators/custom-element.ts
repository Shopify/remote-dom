export function customElement(name: string) {
  return <Class extends CustomElementConstructor>(
    _: Class,
    {addInitializer}: ClassDecoratorContext<Class>,
  ) => {
    addInitializer(function defineElement() {
      globalThis.customElements.define(name, this);
    });
  };
}
