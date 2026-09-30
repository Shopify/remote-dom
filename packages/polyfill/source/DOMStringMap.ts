import {asciiLowercase} from './constants.ts';
import {createDOMException} from './dom-exception.ts';
import type {Element} from './Element.ts';

function toDataAttributeName(name: string) {
  return 'data-' + asciiLowercase(name.replace(/[A-Z]/g, '-$&'));
}

function toDataPropertyName(name: string) {
  return name
    .slice('data-'.length)
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function isValidDataPropertyName(name: string) {
  return !/-[a-z]/.test(name);
}

function validateDataPropertyName(name: string) {
  if (!isValidDataPropertyName(name)) {
    throw createDOMException(
      'The dataset property name must not contain a dash followed by an ASCII lowercase letter.',
      'SyntaxError',
    );
  }
}

export function createDOMStringMap(element: Element): DOMStringMap {
  return new Proxy({} as DOMStringMap, {
    get: (target, name) =>
      typeof name === 'string' && isValidDataPropertyName(name)
        ? (element.getAttribute(toDataAttributeName(name)) ??
          Reflect.get(target, name))
        : Reflect.get(target, name),
    set: (target, name, value) => {
      if (typeof name !== 'string') return Reflect.set(target, name, value);
      validateDataPropertyName(name);
      element.setAttribute(toDataAttributeName(name), String(value));
      return true;
    },
    deleteProperty: (target, name) => {
      if (typeof name !== 'string') {
        return Reflect.deleteProperty(target, name);
      }
      if (!isValidDataPropertyName(name)) return true;
      element.removeAttribute(toDataAttributeName(name));
      return true;
    },
    defineProperty: (target, name, descriptor) => {
      if (typeof name !== 'string') {
        return Reflect.defineProperty(target, name, descriptor);
      }
      if ('get' in descriptor || 'set' in descriptor) return false;
      validateDataPropertyName(name);
      element.setAttribute(toDataAttributeName(name), String(descriptor.value));
      return true;
    },
    preventExtensions: () => false,
    has: (target, name) =>
      Reflect.has(target, name) ||
      (typeof name === 'string' &&
        isValidDataPropertyName(name) &&
        element.hasAttribute(toDataAttributeName(name))),
    ownKeys: (target) => [
      ...element
        .getAttributeNames()
        .filter(
          (name) =>
            name.startsWith('data-') &&
            toDataAttributeName(toDataPropertyName(name)) === name,
        )
        .map(toDataPropertyName),
      ...Reflect.ownKeys(target).filter((key) => typeof key !== 'string'),
    ],
    getOwnPropertyDescriptor: (target, name) => {
      if (typeof name !== 'string') {
        return Reflect.getOwnPropertyDescriptor(target, name);
      }
      if (!isValidDataPropertyName(name)) {
        return Reflect.getOwnPropertyDescriptor(target, name);
      }
      const value = element.getAttribute(toDataAttributeName(name));
      return value == null
        ? Reflect.getOwnPropertyDescriptor(target, name)
        : {value, writable: true, enumerable: true, configurable: true};
    },
  });
}
