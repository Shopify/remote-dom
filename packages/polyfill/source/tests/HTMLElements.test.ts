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

  it('creates generic, unknown, and unregistered custom elements correctly', () => {
    expect(window.document.createElement('article').constructor).toBe(
      window.HTMLElement,
    );
    expect(window.document.createElement('not-an-html-tag')).toBeInstanceOf(
      window.HTMLElement,
    );
    expect(window.document.createElement('unknown')).toBeInstanceOf(
      window.HTMLUnknownElement,
    );
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

    expect(window.document.createElement('test-element')).toBeInstanceOf(
      TestElement,
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
