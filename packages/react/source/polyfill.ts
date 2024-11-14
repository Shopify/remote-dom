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

// React checks whether elements are Iframes on initialization.
Object.defineProperty(globalThis, 'HTMLIFrameElement', {
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
