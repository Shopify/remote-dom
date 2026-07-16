import {Element} from './Element.ts';

const DATA_ATTRIBUTE_PREFIX = 'data-';

function toAttributeName(name: string) {
  return `${DATA_ATTRIBUTE_PREFIX}${name
    .replace(/[A-Z]/g, '-$&')
    .toLowerCase()}`;
}

export class HTMLElement extends Element {
  get dataset(): DOMStringMap {
    const element = this;

    return new Proxy({} as DOMStringMap, {
      get(target, name) {
        if (typeof name !== 'string') return Reflect.get(target, name);
        return element.getAttribute(toAttributeName(name)) ?? undefined;
      },
      set(target, name, value) {
        if (typeof name !== 'string') return Reflect.set(target, name, value);
        element.setAttribute(toAttributeName(name), String(value));
        return true;
      },
      deleteProperty(target, name) {
        if (typeof name !== 'string')
          return Reflect.deleteProperty(target, name);
        element.removeAttribute(toAttributeName(name));
        return true;
      },
    });
  }
}
