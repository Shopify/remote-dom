import {HTMLElement} from './HTMLElement.ts';
import {HTMLBodyElement} from './HTMLBodyElement.ts';
import {HTMLHeadElement} from './HTMLHeadElement.ts';
import {HTMLHtmlElement} from './HTMLHtmlElement.ts';
import {HTMLTemplateElement} from './HTMLTemplateElement.ts';

export {HTMLBodyElement, HTMLHeadElement, HTMLHtmlElement, HTMLTemplateElement};

export class HTMLAnchorElement extends HTMLElement {}
export class HTMLAreaElement extends HTMLElement {}
export class HTMLBaseElement extends HTMLElement {}
export class HTMLBRElement extends HTMLElement {}
export class HTMLButtonElement extends HTMLElement {}
export class HTMLCanvasElement extends HTMLElement {}
export class HTMLDListElement extends HTMLElement {}
export class HTMLDataElement extends HTMLElement {}
export class HTMLDataListElement extends HTMLElement {}
export class HTMLDetailsElement extends HTMLElement {}
export class HTMLDialogElement extends HTMLElement {}
export class HTMLDirectoryElement extends HTMLElement {}
export class HTMLDivElement extends HTMLElement {}
export class HTMLEmbedElement extends HTMLElement {}
export class HTMLFieldSetElement extends HTMLElement {}
export class HTMLFontElement extends HTMLElement {}
export class HTMLFormElement extends HTMLElement {}
export class HTMLFrameElement extends HTMLElement {}
export class HTMLFrameSetElement extends HTMLElement {}
export class HTMLHRElement extends HTMLElement {}
export class HTMLHeadingElement extends HTMLElement {}
export class HTMLIFrameElement extends HTMLElement {}
export class HTMLImageElement extends HTMLElement {}
export class HTMLInputElement extends HTMLElement {}
export class HTMLLIElement extends HTMLElement {}
export class HTMLLabelElement extends HTMLElement {}
export class HTMLLegendElement extends HTMLElement {}
export class HTMLLinkElement extends HTMLElement {}
export class HTMLMapElement extends HTMLElement {}
export class HTMLMarqueeElement extends HTMLElement {}
export class HTMLMediaElement extends HTMLElement {}
export class HTMLAudioElement extends HTMLMediaElement {}
export class HTMLVideoElement extends HTMLMediaElement {}
export class HTMLMenuElement extends HTMLElement {}
export class HTMLMetaElement extends HTMLElement {}
export class HTMLMeterElement extends HTMLElement {}
export class HTMLModElement extends HTMLElement {}
export class HTMLOListElement extends HTMLElement {}
export class HTMLObjectElement extends HTMLElement {}
export class HTMLOptGroupElement extends HTMLElement {}
export class HTMLOptionElement extends HTMLElement {}
export class HTMLOutputElement extends HTMLElement {}
export class HTMLParagraphElement extends HTMLElement {}
export class HTMLParamElement extends HTMLElement {}
export class HTMLPictureElement extends HTMLElement {}
export class HTMLPreElement extends HTMLElement {}
export class HTMLProgressElement extends HTMLElement {}
export class HTMLQuoteElement extends HTMLElement {}
export class HTMLScriptElement extends HTMLElement {}
export class HTMLSelectElement extends HTMLElement {}
export class HTMLSlotElement extends HTMLElement {}
export class HTMLSourceElement extends HTMLElement {}
export class HTMLSpanElement extends HTMLElement {}
export class HTMLStyleElement extends HTMLElement {}
export class HTMLTableCaptionElement extends HTMLElement {}
export class HTMLTableCellElement extends HTMLElement {}
export class HTMLTableColElement extends HTMLElement {}
export class HTMLTableElement extends HTMLElement {}
export class HTMLTableRowElement extends HTMLElement {}
export class HTMLTableSectionElement extends HTMLElement {}
export class HTMLTextAreaElement extends HTMLElement {}
export class HTMLTimeElement extends HTMLElement {}
export class HTMLTitleElement extends HTMLElement {}
export class HTMLTrackElement extends HTMLElement {}
export class HTMLUListElement extends HTMLElement {}
export class HTMLUnknownElement extends HTMLElement {}

type HTMLElementConstructor = new () => HTMLElement;

export const HTML_ELEMENT_CONSTRUCTORS: Record<string, HTMLElementConstructor> =
  {
    a: HTMLAnchorElement,
    abbr: HTMLElement,
    address: HTMLElement,
    area: HTMLAreaElement,
    article: HTMLElement,
    aside: HTMLElement,
    audio: HTMLAudioElement,
    b: HTMLElement,
    base: HTMLBaseElement,
    bdi: HTMLElement,
    bdo: HTMLElement,
    blockquote: HTMLQuoteElement,
    body: HTMLBodyElement,
    br: HTMLBRElement,
    button: HTMLButtonElement,
    canvas: HTMLCanvasElement,
    caption: HTMLTableCaptionElement,
    col: HTMLTableColElement,
    colgroup: HTMLTableColElement,
    cite: HTMLElement,
    code: HTMLElement,
    data: HTMLDataElement,
    datalist: HTMLDataListElement,
    dd: HTMLElement,
    del: HTMLModElement,
    details: HTMLDetailsElement,
    dfn: HTMLElement,
    dialog: HTMLDialogElement,
    dir: HTMLDirectoryElement,
    div: HTMLDivElement,
    dl: HTMLDListElement,
    dt: HTMLElement,
    em: HTMLElement,
    embed: HTMLEmbedElement,
    fieldset: HTMLFieldSetElement,
    figcaption: HTMLElement,
    figure: HTMLElement,
    font: HTMLFontElement,
    footer: HTMLElement,
    form: HTMLFormElement,
    frame: HTMLFrameElement,
    frameset: HTMLFrameSetElement,
    h1: HTMLHeadingElement,
    h2: HTMLHeadingElement,
    h3: HTMLHeadingElement,
    h4: HTMLHeadingElement,
    h5: HTMLHeadingElement,
    h6: HTMLHeadingElement,
    head: HTMLHeadElement,
    header: HTMLElement,
    hgroup: HTMLElement,
    hr: HTMLHRElement,
    html: HTMLHtmlElement,
    i: HTMLElement,
    iframe: HTMLIFrameElement,
    img: HTMLImageElement,
    input: HTMLInputElement,
    ins: HTMLModElement,
    kbd: HTMLElement,
    label: HTMLLabelElement,
    legend: HTMLLegendElement,
    li: HTMLLIElement,
    link: HTMLLinkElement,
    main: HTMLElement,
    map: HTMLMapElement,
    marquee: HTMLMarqueeElement,
    mark: HTMLElement,
    menu: HTMLMenuElement,
    meta: HTMLMetaElement,
    meter: HTMLMeterElement,
    nav: HTMLElement,
    noscript: HTMLElement,
    object: HTMLObjectElement,
    ol: HTMLOListElement,
    optgroup: HTMLOptGroupElement,
    option: HTMLOptionElement,
    output: HTMLOutputElement,
    p: HTMLParagraphElement,
    param: HTMLParamElement,
    picture: HTMLPictureElement,
    pre: HTMLPreElement,
    progress: HTMLProgressElement,
    q: HTMLQuoteElement,
    rp: HTMLElement,
    rt: HTMLElement,
    ruby: HTMLElement,
    s: HTMLElement,
    samp: HTMLElement,
    script: HTMLScriptElement,
    search: HTMLElement,
    section: HTMLElement,
    select: HTMLSelectElement,
    slot: HTMLSlotElement,
    small: HTMLElement,
    source: HTMLSourceElement,
    span: HTMLSpanElement,
    strong: HTMLElement,
    style: HTMLStyleElement,
    sub: HTMLElement,
    summary: HTMLElement,
    sup: HTMLElement,
    table: HTMLTableElement,
    tbody: HTMLTableSectionElement,
    td: HTMLTableCellElement,
    template: HTMLTemplateElement,
    textarea: HTMLTextAreaElement,
    tfoot: HTMLTableSectionElement,
    th: HTMLTableCellElement,
    thead: HTMLTableSectionElement,
    time: HTMLTimeElement,
    title: HTMLTitleElement,
    tr: HTMLTableRowElement,
    track: HTMLTrackElement,
    u: HTMLElement,
    ul: HTMLUListElement,
    var: HTMLElement,
    video: HTMLVideoElement,
    wbr: HTMLElement,
  };
