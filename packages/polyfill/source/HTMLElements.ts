import {NamespaceURI} from './constants.ts';
import {Element} from './Element.ts';

type ElementConstructor = typeof Element;

const HTML_ELEMENT_LOCAL_NAMES = {
  HTMLAnchorElement: ['a'],
  HTMLAreaElement: ['area'],
  HTMLAudioElement: ['audio'],
  HTMLBaseElement: ['base'],
  HTMLBodyElement: ['body'],
  HTMLBRElement: ['br'],
  HTMLButtonElement: ['button'],
  HTMLCanvasElement: ['canvas'],
  HTMLDListElement: ['dl'],
  HTMLDataElement: ['data'],
  HTMLDataListElement: ['datalist'],
  HTMLDetailsElement: ['details'],
  HTMLDialogElement: ['dialog'],
  HTMLDirectoryElement: ['dir'],
  HTMLDivElement: ['div'],
  HTMLEmbedElement: ['embed'],
  HTMLFieldSetElement: ['fieldset'],
  HTMLFontElement: ['font'],
  HTMLFormElement: ['form'],
  HTMLFrameElement: ['frame'],
  HTMLFrameSetElement: ['frameset'],
  HTMLHeadElement: ['head'],
  HTMLHeadingElement: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  HTMLHRElement: ['hr'],
  HTMLHtmlElement: ['html'],
  HTMLIFrameElement: ['iframe'],
  HTMLImageElement: ['img'],
  HTMLInputElement: ['input'],
  HTMLLabelElement: ['label'],
  HTMLLegendElement: ['legend'],
  HTMLLIElement: ['li'],
  HTMLLinkElement: ['link'],
  HTMLMapElement: ['map'],
  HTMLMarqueeElement: ['marquee'],
  HTMLMediaElement: ['audio', 'video'],
  HTMLMenuElement: ['menu'],
  HTMLMetaElement: ['meta'],
  HTMLMeterElement: ['meter'],
  HTMLModElement: ['del', 'ins'],
  HTMLOListElement: ['ol'],
  HTMLObjectElement: ['object'],
  HTMLOptGroupElement: ['optgroup'],
  HTMLOptionElement: ['option'],
  HTMLOutputElement: ['output'],
  HTMLParagraphElement: ['p'],
  HTMLParamElement: ['param'],
  HTMLPictureElement: ['picture'],
  HTMLPreElement: ['pre', 'listing', 'xmp'],
  HTMLProgressElement: ['progress'],
  HTMLQuoteElement: ['blockquote', 'q'],
  HTMLScriptElement: ['script'],
  HTMLSelectElement: ['select'],
  HTMLSlotElement: ['slot'],
  HTMLSourceElement: ['source'],
  HTMLSpanElement: ['span'],
  HTMLStyleElement: ['style'],
  HTMLTableCaptionElement: ['caption'],
  HTMLTableCellElement: ['td', 'th'],
  HTMLTableColElement: ['col', 'colgroup'],
  HTMLTableElement: ['table'],
  HTMLTableRowElement: ['tr'],
  HTMLTableSectionElement: ['tbody', 'tfoot', 'thead'],
  HTMLTextAreaElement: ['textarea'],
  HTMLTimeElement: ['time'],
  HTMLTitleElement: ['title'],
  HTMLTrackElement: ['track'],
  HTMLUListElement: ['ul'],
  HTMLVideoElement: ['video'],
} as const;

const GENERIC_HTML_LOCAL_NAMES = [
  'abbr',
  'acronym',
  'address',
  'article',
  'aside',
  'b',
  'basefont',
  'bdi',
  'bdo',
  'big',
  'center',
  'cite',
  'code',
  'dd',
  'dfn',
  'dt',
  'em',
  'figcaption',
  'figure',
  'footer',
  'header',
  'hgroup',
  'i',
  'kbd',
  'main',
  'mark',
  'menuitem',
  'nav',
  'nobr',
  'noembed',
  'noframes',
  'noscript',
  'plaintext',
  'rb',
  'rp',
  'rt',
  'rtc',
  'ruby',
  's',
  'samp',
  'search',
  'section',
  'small',
  'strike',
  'strong',
  'sub',
  'summary',
  'sup',
  'template',
  'tt',
  'u',
  'var',
  'wbr',
] as const;

const KNOWN_HTML_LOCAL_NAMES = new Set<string>([
  ...GENERIC_HTML_LOCAL_NAMES,
  ...Object.values(HTML_ELEMENT_LOCAL_NAMES).flat(),
]);

function isHTMLElement(value: unknown): value is Element {
  return value instanceof Element && value.namespaceURI === NamespaceURI.XHTML;
}

function createElementConstructor(
  name: string,
  matches: (element: Element) => boolean,
) {
  const Constructor = function () {
    throw new TypeError('Illegal constructor');
  } as unknown as ElementConstructor;

  Object.defineProperties(Constructor, {
    name: {value: name},
    prototype: {value: Element.prototype},
    [Symbol.hasInstance]: {
      value(value: unknown) {
        return isHTMLElement(value) && matches(value);
      },
    },
  });

  return Constructor;
}

const TAG_SPECIFIC_HTML_ELEMENT_GLOBALS = Object.fromEntries(
  Object.entries(HTML_ELEMENT_LOCAL_NAMES).map(([name, localNames]) => {
    const names = new Set<string>(localNames);
    return [
      name,
      createElementConstructor(name, (element) =>
        names.has(element.localName.toLowerCase()),
      ),
    ];
  }),
) as {
  [Name in keyof typeof HTML_ELEMENT_LOCAL_NAMES]: ElementConstructor;
};

export const HTML_ELEMENT_GLOBALS = {
  ...TAG_SPECIFIC_HTML_ELEMENT_GLOBALS,
  HTMLUnknownElement: createElementConstructor(
    'HTMLUnknownElement',
    (element) => {
      const localName = element.localName.toLowerCase();
      return !localName.includes('-') && !KNOWN_HTML_LOCAL_NAMES.has(localName);
    },
  ),
};
