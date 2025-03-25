export function customElement(name: string) {
  return <Class extends CustomElementConstructor>(
    _: Class,
    {addInitializer}: ClassDecoratorContext<Class>,
  ) => {
    addInitializer(function defineElement() {
      customElements.define(name, this);
    });
  };
}
