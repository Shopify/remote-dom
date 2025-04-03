export interface Hooks {
  createElement(element: Element, ns?: string | null): void;
  setAttribute(
    element: Element,
    name: string,
    value: string,
    ns?: string | null,
  ): void;
  removeAttribute(element: Element, name: string, ns?: string | null): void;
  createText(text: Text, data: string): void;
  setText(text: Text, data: string): void;
  insertChild(parent: Element, node: Element | Text): void;
  removeChild(parent: Element, node: Element | Text): void;
  addEventListener(
    element: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    element: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void;
}
