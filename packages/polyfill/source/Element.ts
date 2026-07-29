import {
  NS,
  ATTRIBUTES,
  CLASS_LIST,
  DATASET,
  NamespaceURI,
  NodeType,
} from './constants.ts';
import {ParentNode} from './ParentNode.ts';
import {NamedNodeMap} from './NamedNodeMap.ts';
import {Attr} from './Attr.ts';
import {serializeNode, serializeChildren, parseHtml} from './serialization.ts';
import {matchesSelector} from './selectors.ts';

function toDataAttributeName(name: string) {
  return 'data-' + name.replace(/[A-Z]/g, '-$&').toLowerCase();
}

function isTokenIndex(name: PropertyKey) {
  return typeof name === 'string' && name === String(+name);
}

class DOMTokenList {
  readonly [index: number]: string;

  constructor(private element: Element) {}

  private get tokens() {
    return this.element.className.trim().split(/\s+/).filter(Boolean);
  }

  get length() {
    return this.tokens.length;
  }

  get value() {
    return this.element.className;
  }

  set value(value: string) {
    this.element.className = String(value);
  }

  item(index: number) {
    return this.tokens[index] ?? null;
  }

  contains(token: string) {
    return this.tokens.includes(String(token));
  }

  add(...tokens: string[]) {
    this.value = [...new Set([...this.tokens, ...tokens.map(String)])].join(
      ' ',
    );
  }

  remove(...tokens: string[]) {
    const removed = new Set(tokens.map(String));
    this.value = this.tokens.filter((token) => !removed.has(token)).join(' ');
  }

  toggle(token: string, force?: boolean) {
    const present = this.contains(token);
    const next = force === undefined ? !present : Boolean(force);

    if (next !== present) {
      if (next) this.add(token);
      else this.remove(token);
    }

    return next;
  }

  replace(token: string, newToken: string) {
    const tokens = this.tokens;
    const index = tokens.indexOf(String(token));
    if (index < 0) return false;

    tokens[index] = String(newToken);
    this.value = [...new Set(tokens)].join(' ');
    return true;
  }

  toString() {
    return this.value;
  }

  [Symbol.iterator]() {
    return this.tokens[Symbol.iterator]();
  }
}

export class Element extends ParentNode {
  static readonly observedAttributes?: string[];

  nodeType = NodeType.ELEMENT_NODE;

  [NS] = NamespaceURI.XHTML;
  get namespaceURI() {
    return this[NS];
  }

  get tagName() {
    return this.nodeName;
  }

  get className() {
    return this.getAttribute('class') ?? '';
  }

  set className(value: string) {
    this.setAttribute('class', String(value));
  }

  [CLASS_LIST]?: DOMTokenList;

  get classList() {
    return (this[CLASS_LIST] ??= new Proxy(new DOMTokenList(this), {
      get(target, name, receiver) {
        return isTokenIndex(name)
          ? (target.item(+(name as string)) ?? undefined)
          : Reflect.get(target, name, receiver);
      },
      set(target, name, value, receiver) {
        return (
          !isTokenIndex(name) && Reflect.set(target, name, value, receiver)
        );
      },
    }));
  }

  [DATASET]?: DOMStringMap;

  get dataset(): DOMStringMap {
    return (this[DATASET] ??= new Proxy({} as DOMStringMap, {
      get: (target, name) =>
        typeof name !== 'string'
          ? Reflect.get(target, name)
          : (this.getAttribute(toDataAttributeName(name)) ?? undefined),
      set: (target, name, value) => {
        if (typeof name !== 'string') return Reflect.set(target, name, value);
        this.setAttribute(toDataAttributeName(name), String(value));
        return true;
      },
      deleteProperty: (target, name) => {
        if (typeof name !== 'string') {
          return Reflect.deleteProperty(target, name);
        }
        this.removeAttribute(toDataAttributeName(name));
        return true;
      },
    }));
  }

  [ATTRIBUTES]!: NamedNodeMap;

  [anyProperty: string]: any;

  get slot() {
    return this.getAttribute('slot') ?? '';
  }

  set slot(slot: string) {
    const finalSlot = String(slot);

    if (this.getAttribute('slot') !== finalSlot) {
      this.attributes.setNamedItem(new Attr('slot', finalSlot));
    }
  }

  get attributes() {
    let attributes = this[ATTRIBUTES];
    if (!attributes) {
      attributes = new NamedNodeMap(this);
      this[ATTRIBUTES] = attributes;
    }
    return attributes;
  }

  getAttributeNames() {
    return [...this.attributes].map((attr) => attr.name);
  }

  get firstElementChild() {
    return this.children[0] ?? null;
  }

  get lastElementChild() {
    return this.children[this.children.length - 1] ?? null;
  }

  get nextElementSibling() {
    let sib = this.nextSibling;
    while (sib && sib.nodeType !== 1) sib = sib.nextSibling;
    return sib;
  }

  get previousElementSibling() {
    let sib = this.previousSibling;
    while (sib && sib.nodeType !== 1) sib = sib.previousSibling;
    return sib;
  }

  setAttribute(name: string, value: string) {
    this.attributes.setNamedItem(new Attr(name, String(value)));
  }

  setAttributeNS(namespace: NamespaceURI | null, name: string, value: string) {
    this.attributes.setNamedItemNS(new Attr(name, String(value), namespace));
  }

  getAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr && attr.value;
  }

  getAttributeNS(namespace: NamespaceURI | null, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr && attr.value;
  }

  hasAttribute(name: string) {
    const attr = this.attributes.getNamedItem(name);
    return attr != null;
  }

  hasAttributeNS(namespace: NamespaceURI | null, name: string) {
    const attr = this.attributes.getNamedItemNS(namespace, name);
    return attr != null;
  }

  removeAttribute(name: string) {
    this.attributes.removeNamedItem(name);
  }

  removeAttributeNS(namespace: NamespaceURI | null, name: string) {
    this.attributes.removeNamedItemNS(namespace, name);
  }

  matches(selector: string) {
    return matchesSelector(this, selector);
  }

  closest(selector: string) {
    let element: Element | null = this;

    while (element) {
      if (element.matches(selector)) return element;
      element = element.parentElement as Element | null;
    }

    return null;
  }

  get outerHTML() {
    return serializeNode(this);
  }

  get innerHTML() {
    return serializeChildren(this);
  }

  set innerHTML(html: any) {
    if (html == null || html === '') {
      this.replaceChildren();
    } else {
      const fragment = parseHtml(String(html), this);
      this.replaceChildren(fragment);
    }
  }
}
