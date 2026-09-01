import {NamespaceURI} from './constants.ts';
import {Element} from './Element.ts';

export class HTMLElement extends Element {
  static [Symbol.hasInstance](value: unknown) {
    // Custom element subclasses still use their real prototype chain. The base
    // HTMLElement check also recognizes the polyfill's deliberately-flat HTML
    // elements without requiring createElement() to construct a second tree of
    // tag-specific classes.
    if (this !== HTMLElement) {
      return Function.prototype[Symbol.hasInstance].call(this, value);
    }

    return (
      value instanceof Element && value.namespaceURI === NamespaceURI.XHTML
    );
  }
}
