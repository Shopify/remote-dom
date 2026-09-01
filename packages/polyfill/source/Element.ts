import {
  NS,
  ATTRIBUTES,
  CLASS_LIST,
  DATASET,
  OWNER_ELEMENT,
  VALUE,
  HTML_NAMESPACE,
  NODE_TYPE_ELEMENT,
  type NamespaceURI,
  type NodeType,
} from './constants.ts';
import {ParentNode} from './ParentNode.ts';
import {getElementsByClassName as findElementsByClassName} from './getElementsByClassName.ts';
import {NamedNodeMap} from './NamedNodeMap.ts';
import {Attr} from './Attr.ts';
import {serializeNode, serializeChildren, parseHtml} from './serialization.ts';
import {getElementsByTagName as findElementsByTagName} from './shared.ts';
import {matchesSelector} from './selectors.ts';

function toDataAttributeName(name: string) {
  return 'data-' + name.replace(/[A-Z]/g, '-$&').toLowerCase();
}

function toDataPropertyName(name: string) {
  return name
    .slice('data-'.length)
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function isTokenIndex(name: PropertyKey) {
  return typeof name === 'string' && name === String(+name);
}

class DOMTokenList {
  readonly [index: number]: string;
  [OWNER_ELEMENT]: Element;

  constructor(element: Element) {
    this[OWNER_ELEMENT] = element;
  }

  get [VALUE]() {
    return this[OWNER_ELEMENT].className.trim().split(/\s+/).filter(Boolean);
  }

  get length() {
    return this[VALUE].length;
  }

  get value() {
    return this[OWNER_ELEMENT].className;
  }

  set value(value: string) {
    this[OWNER_ELEMENT].className = String(value);
  }

  item(index: number) {
    return this[VALUE][index] ?? null;
  }

  contains(token: string) {
    return this[VALUE].includes(String(token));
  }

  add(...tokens: string[]) {
    this.value = [...new Set([...this[VALUE], ...tokens.map(String)])].join(
      ' ',
    );
  }

  remove(...tokens: string[]) {
    const removed = new Set(tokens.map(String));
    this.value = this[VALUE].filter((token) => !removed.has(token)).join(' ');
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
    const tokens = this[VALUE];
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
    return this[VALUE][Symbol.iterator]();
  }
}

Object.setPrototypeOf(
  DOMTokenList.prototype,
  new Proxy(
    {},
    {
      get(target, name, receiver) {
        return isTokenIndex(name)
          ? (receiver as DOMTokenList)[VALUE][+(name as string)]
          : Reflect.get(target, name, receiver);
      },
      set(target, name, value, receiver) {
        return isTokenIndex(name) || Reflect.set(target, name, value, receiver);
      },
    },
  ),
);

export class Element extends ParentNode {
  static readonly observedAttributes?: string[];

  nodeType: NodeType = NODE_TYPE_ELEMENT;

  [NS]: NamespaceURI = HTML_NAMESPACE;
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
    return (this[CLASS_LIST] ??= new DOMTokenList(this));
  }

  [DATASET]?: DOMStringMap;

  get dataset(): DOMStringMap {
    return (this[DATASET] ??= new Proxy({} as DOMStringMap, {
      get: (target, name) =>
        typeof name !== 'string' || Reflect.has(target, name)
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
      has: (target, name) =>
        Reflect.has(target, name) ||
        (typeof name === 'string' &&
          this.hasAttribute(toDataAttributeName(name))),
      ownKeys: () =>
        this.getAttributeNames()
          .filter(
            (name) =>
              name.startsWith('data-') &&
              toDataAttributeName(toDataPropertyName(name)) === name,
          )
          .map(toDataPropertyName),
      getOwnPropertyDescriptor: (target, name) => {
        if (typeof name !== 'string' || Reflect.has(target, name)) {
          return Reflect.getOwnPropertyDescriptor(target, name);
        }
        const value = this.getAttribute(toDataAttributeName(name));
        if (value == null) return undefined;
        return {value, writable: true, enumerable: true, configurable: true};
      },
    }));
  }

  [ATTRIBUTES]!: NamedNodeMap;

  [anyProperty: string]: any;

  get id() {
    return this.getAttribute('id') ?? '';
  }

  set id(id: string) {
    this.setAttribute('id', String(id));
  }

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

  getElementsByTagName(qualifiedName: string) {
    return findElementsByTagName(this, qualifiedName);
  }

  get firstElementChild() {
    return this.children[0] ?? null;
  }

  getElementsByClassName(classNames: string) {
    return findElementsByClassName(this, classNames);
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
