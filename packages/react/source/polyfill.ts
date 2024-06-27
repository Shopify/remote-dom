import {window} from '@remote-dom/core/polyfill';

class HTMLIFrameElement extends HTMLElement {}

class CSSStyleDeclaration {
  getPropertyValue(_key: string): string | null | undefined {
    return undefined;
  }

  removeProperty(_key: string) {
    // noop
  }

  setProperty(_key: string, _value?: string | null) {
    // noop
  }

  get cssText() {
    return '';
  }

  set cssText(_css) {
    // noop
  }
}

// React ues the `location` property when printing help text in development.
if (!window.location) {
  Object.defineProperty(window, 'location', {
    value: globalThis.location ?? {protocol: 'https:'},
    configurable: true,
  });
}

if (!window.navigator) {
  Object.defineProperty(window, 'navigator', {
    value: globalThis.navigator ?? {userAgent: ''},
    configurable: true,
  });
}

// React checks whether elements are Iframes on initialization.
Object.defineProperty(window, 'HTMLIFrameElement', {
  value: HTMLIFrameElement,
  configurable: true,
});

// React checks for a few properties in `document.createElement('div').style`
const STYLE = Symbol('style');
Object.defineProperty(Element.prototype, 'style', {
  configurable: true,
  get() {
    let style = this[STYLE];
    if (!style) {
      style = new CSSStyleDeclaration();
      this[STYLE] = style;
    }
    return style;
  },
  set(cssText) {
    this.style.cssText = String(cssText);
  },
});
