import {beforeEach, describe, expect, it} from 'vitest';

import {Window} from '../Window.ts';

describe('HTML element constructors', () => {
  let window: Window;

  beforeEach(() => {
    window = new Window();
  });

  it.each([
    ['a', 'HTMLAnchorElement'],
    ['button', 'HTMLButtonElement'],
    ['form', 'HTMLFormElement'],
    ['img', 'HTMLImageElement'],
    ['input', 'HTMLInputElement'],
    ['select', 'HTMLSelectElement'],
    ['table', 'HTMLTableElement'],
    ['td', 'HTMLTableCellElement'],
    ['textarea', 'HTMLTextAreaElement'],
  ])('creates <%s> with %s identity', (tagName, constructorName) => {
    const Constructor = (window as any)[constructorName];
    const element = window.document.createElement(tagName);

    expect(Constructor).toBeTypeOf('function');
    expect(element).toBeInstanceOf(Constructor);
    expect(element).toBeInstanceOf(window.HTMLElement);
    expect(element).toBeInstanceOf(window.Element);
  });

  it('keeps ordinary elements on the shared Element prototype', () => {
    const input = window.document.createElement('input');

    expect(input.constructor).toBe(window.Element);
    expect(Object.getPrototypeOf(input)).toBe(window.Element.prototype);
    expect(input).toBeInstanceOf(window.HTMLInputElement);
    expect(input).toBeInstanceOf(window.HTMLElement);
  });

  it('keeps distinct element constructor identities', () => {
    const input = window.document.createElement('input');

    expect(input).toBeInstanceOf(window.HTMLInputElement);
    expect(input).not.toBeInstanceOf(window.HTMLFormElement);
  });

  it('uses the shared media superclass for audio and video', () => {
    expect(window.document.createElement('audio')).toBeInstanceOf(
      window.HTMLMediaElement,
    );
    expect(window.document.createElement('video')).toBeInstanceOf(
      window.HTMLMediaElement,
    );
  });

  it('identifies generic, unknown, and unregistered custom elements', () => {
    const article = window.document.createElement('article');
    const custom = window.document.createElement('not-an-html-tag');
    const unknown = window.document.createElement('unknown');

    expect(article.constructor).toBe(window.Element);
    expect(article).toBeInstanceOf(window.HTMLElement);
    expect(article).not.toBeInstanceOf(window.HTMLUnknownElement);
    expect(custom).toBeInstanceOf(window.HTMLElement);
    expect(custom).not.toBeInstanceOf(window.HTMLUnknownElement);
    expect(unknown).toBeInstanceOf(window.HTMLUnknownElement);
  });

  it('does not identify SVG elements as HTML elements', () => {
    const anchor = window.document.createElementNS(
      'http://www.w3.org/2000/svg' as any,
      'a',
    );

    expect(anchor).not.toBeInstanceOf(window.HTMLElement);
    expect(anchor).not.toBeInstanceOf(window.HTMLAnchorElement);
  });

  it('preserves constructors for built-in document elements and templates', () => {
    expect(window.document.documentElement).toBeInstanceOf(
      window.HTMLHtmlElement,
    );
    expect(window.document.head).toBeInstanceOf(window.HTMLHeadElement);
    expect(window.document.body).toBeInstanceOf(window.HTMLBodyElement);
    expect(window.document.createElement('template')).toBeInstanceOf(
      window.HTMLTemplateElement,
    );
  });

  it('continues to construct registered custom elements', () => {
    class TestElement extends window.HTMLElement {}

    window.customElements.define('test-element', TestElement as any);

    const element = window.document.createElement('test-element');

    expect(element).toBeInstanceOf(TestElement);
    expect(element).toBeInstanceOf(window.HTMLElement);
  });

  it('keeps custom element subclass instanceof checks prototype-based', () => {
    class FirstElement extends window.HTMLElement {}
    class SecondElement extends window.HTMLElement {}

    window.customElements.define('first-element', FirstElement as any);
    const element = window.document.createElement('first-element');

    expect(element).toBeInstanceOf(FirstElement);
    expect(element).not.toBeInstanceOf(SecondElement);
  });

  it('does not construct tag-specific facade classes', () => {
    expect(() => new window.HTMLInputElement()).toThrowError(
      new TypeError('Illegal constructor'),
    );
  });

  it('installs every standard HTML element constructor as a global', () => {
    const constructorNames = [
      'HTMLAnchorElement',
      'HTMLAreaElement',
      'HTMLAudioElement',
      'HTMLBRElement',
      'HTMLBaseElement',
      'HTMLBodyElement',
      'HTMLButtonElement',
      'HTMLCanvasElement',
      'HTMLDListElement',
      'HTMLDataElement',
      'HTMLDataListElement',
      'HTMLDetailsElement',
      'HTMLDialogElement',
      'HTMLDirectoryElement',
      'HTMLDivElement',
      'HTMLEmbedElement',
      'HTMLFieldSetElement',
      'HTMLFontElement',
      'HTMLFormElement',
      'HTMLFrameElement',
      'HTMLFrameSetElement',
      'HTMLHRElement',
      'HTMLHeadElement',
      'HTMLHeadingElement',
      'HTMLHtmlElement',
      'HTMLIFrameElement',
      'HTMLImageElement',
      'HTMLInputElement',
      'HTMLLIElement',
      'HTMLLabelElement',
      'HTMLLegendElement',
      'HTMLLinkElement',
      'HTMLMapElement',
      'HTMLMarqueeElement',
      'HTMLMediaElement',
      'HTMLMenuElement',
      'HTMLMetaElement',
      'HTMLMeterElement',
      'HTMLModElement',
      'HTMLOListElement',
      'HTMLObjectElement',
      'HTMLOptGroupElement',
      'HTMLOptionElement',
      'HTMLOutputElement',
      'HTMLParagraphElement',
      'HTMLParamElement',
      'HTMLPictureElement',
      'HTMLPreElement',
      'HTMLProgressElement',
      'HTMLQuoteElement',
      'HTMLScriptElement',
      'HTMLSelectElement',
      'HTMLSlotElement',
      'HTMLSourceElement',
      'HTMLSpanElement',
      'HTMLStyleElement',
      'HTMLTableCaptionElement',
      'HTMLTableCellElement',
      'HTMLTableColElement',
      'HTMLTableElement',
      'HTMLTableRowElement',
      'HTMLTableSectionElement',
      'HTMLTemplateElement',
      'HTMLTextAreaElement',
      'HTMLTimeElement',
      'HTMLTitleElement',
      'HTMLTrackElement',
      'HTMLUListElement',
      'HTMLUnknownElement',
      'HTMLVideoElement',
    ];

    for (const name of constructorNames) {
      expect((window as any)[name], name).toBeTypeOf('function');
    }
  });
});
