class HTMLIFrameElement extends HTMLElement {}

// React checks whether elements are Iframes on initialization.
defineGlobalProperty('HTMLIFrameElement', {
  value: HTMLIFrameElement,
  configurable: true,
});

// React ues the `location` and `navigator` properties when printing help text in
// development, and the `Window` polyfill from Remote DOM doesn’t define these properties.
// We copy their implementation from the existing global scope when it exists, and
// provide a minimal working implementation otherwise.
defineGlobalProperty('location', {
  value: globalThis.location ?? {protocol: 'https:'},
  configurable: true,
});

defineGlobalProperty('navigator', {
  value: globalThis.navigator ?? {userAgent: ''},
  configurable: true,
});

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

function defineGlobalProperty(name: string, descriptor: PropertyDescriptor) {
  Object.defineProperty(window, name, descriptor);
  Object.defineProperty(globalThis, name, descriptor);
}

export {};
